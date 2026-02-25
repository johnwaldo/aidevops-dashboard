#!/usr/bin/env bash
# dashboard.sh - AiDevOps Dashboard service manager
#
# Manages the dashboard server as a persistent service via macOS LaunchAgent
# or Linux systemd (future). Follows the auto-update-helper.sh pattern.
#
# The dashboard server (Bun + TypeScript) runs as a KeepAlive service:
#   - Starts on login (RunAtLoad)
#   - Auto-restarts on crash (KeepAlive)
#   - Logs to ~/.aidevops/logs/dashboard.log
#
# Usage:
#   dashboard.sh enable            Install and start the LaunchAgent
#   dashboard.sh disable           Stop and remove the LaunchAgent
#   dashboard.sh restart           Restart the server (e.g. after update)
#   dashboard.sh status            Show service status and version
#   dashboard.sh logs [--tail N]   View server logs
#   dashboard.sh help              Show this help
#
# Configuration:
#   AIDEVOPS_DASHBOARD_PORT=3100   Override default port (env var)
#
# Logs: ~/.aidevops/logs/dashboard.log
set -euo pipefail

# Resolve symlinks to find real script location
_resolve_script_path() {
	local src="${BASH_SOURCE[0]}"
	while [[ -L "$src" ]]; do
		local dir
		dir="$(cd "$(dirname "$src")" && pwd)" || return 1
		src="$(readlink "$src")"
		[[ "$src" != /* ]] && src="$dir/$src"
	done
	cd "$(dirname "$src")" && pwd
}
SCRIPT_DIR="$(_resolve_script_path)" || exit
unset -f _resolve_script_path

# Source shared constants (colors, print helpers, logging)
SHARED_CONSTANTS="${HOME}/.aidevops/agents/scripts/shared-constants.sh"
if [[ -f "$SHARED_CONSTANTS" ]]; then
	# shellcheck source=/dev/null
	source "$SHARED_CONSTANTS"
else
	# Minimal fallback if framework not installed
	NC='\033[0m'
	GREEN='\033[0;32m'
	YELLOW='\033[1;33m'
	RED='\033[0;31m'
	WHITE='\033[1;37m'
	print_error() {
		echo -e "${RED}[ERROR]${NC} $1" >&2
		return 0
	}
	print_success() {
		echo -e "${GREEN}[SUCCESS]${NC} $1"
		return 0
	}
	print_info() {
		echo -e "[INFO] $1"
		return 0
	}
fi

init_log_file 2>/dev/null || true

# Configuration
readonly REPO_DIR="$SCRIPT_DIR"
readonly LABEL="com.aidevops.dashboard"
readonly LAUNCHD_DIR="${HOME}/Library/LaunchAgents"
readonly LAUNCHD_PLIST="${LAUNCHD_DIR}/${LABEL}.plist"
readonly LOG_DIR="${HOME}/.aidevops/logs"
readonly LOG_FILE="${LOG_DIR}/dashboard.log"
readonly STATE_FILE="${HOME}/.aidevops/cache/dashboard-state.json"
readonly BIN_DIR="${HOME}/.aidevops/bin"
readonly BIN_LINK="${BIN_DIR}/aidevops-dashboard"

#######################################
# Logging (structured, to log file)
#######################################
log() {
	local level="$1"
	shift
	local timestamp
	timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
	echo "[$timestamp] [$level] $*" >>"$LOG_FILE"
	return 0
}

log_info() {
	log "INFO" "$@"
	return 0
}
log_warn() {
	log "WARN" "$@"
	return 0
}
log_error() {
	log "ERROR" "$@"
	return 0
}

#######################################
# Ensure directories exist
#######################################
ensure_dirs() {
	mkdir -p "$LOG_DIR" "$LAUNCHD_DIR" "$BIN_DIR" "${HOME}/.aidevops/cache" 2>/dev/null || true
	return 0
}

#######################################
# Detect scheduler backend for current platform
#######################################
_get_scheduler_backend() {
	if [[ "$(uname)" == "Darwin" ]]; then
		echo "launchd"
	else
		echo "systemd"
	fi
	return 0
}

#######################################
# Find bun binary
#######################################
_find_bun() {
	local bun_path
	bun_path="$(command -v bun 2>/dev/null || true)"
	if [[ -z "$bun_path" ]]; then
		for p in "${HOME}/.bun/bin/bun" /opt/homebrew/bin/bun /usr/local/bin/bun; do
			if [[ -x "$p" ]]; then
				bun_path="$p"
				break
			fi
		done
	fi
	if [[ -z "$bun_path" ]]; then
		print_error "bun not found. Install: https://bun.sh"
		return 1
	fi
	echo "$bun_path"
	return 0
}

#######################################
# Get dashboard version from package.json
#######################################
_get_version() {
	if [[ -f "${REPO_DIR}/package.json" ]]; then
		grep '"version"' "${REPO_DIR}/package.json" | head -1 | sed 's/.*: *"\(.*\)".*/\1/'
	else
		echo "unknown"
	fi
	return 0
}

#######################################
# Check if the LaunchAgent is loaded
#######################################
_launchd_is_loaded() {
	local output
	output=$(launchctl list 2>/dev/null) || true
	echo "$output" | grep -qF "$LABEL"
	return $?
}

#######################################
# Generate LaunchAgent plist content
# Arguments:
#   $1 - bun_path
#   $2 - repo_dir
#   $3 - env_path
#######################################
_generate_plist() {
	local bun_path="$1"
	local repo_dir="$2"
	local env_path="$3"

	cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${LABEL}</string>
	<key>ProgramArguments</key>
	<array>
		<string>${bun_path}</string>
		<string>server/index.ts</string>
	</array>
	<key>WorkingDirectory</key>
	<string>${repo_dir}</string>
	<key>StandardOutPath</key>
	<string>${LOG_FILE}</string>
	<key>StandardErrorPath</key>
	<string>${LOG_FILE}</string>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>${env_path}</string>
		<key>HOME</key>
		<string>${HOME}</string>
	</dict>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>ThrottleInterval</key>
	<integer>5</integer>
	<key>ProcessType</key>
	<string>Standard</string>
</dict>
</plist>
EOF
	return 0
}

#######################################
# Update state file
#######################################
_update_state() {
	local action="$1"
	local status="${2:-success}"
	local version
	version="$(_get_version)"
	local timestamp
	timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

	if command -v jq &>/dev/null; then
		local tmp_state
		tmp_state=$(mktemp)
		trap 'rm -f "${tmp_state:-}"' RETURN

		if [[ -f "$STATE_FILE" ]]; then
			jq --arg action "$action" \
				--arg version "$version" \
				--arg status "$status" \
				--arg ts "$timestamp" \
				'. + {
					last_action: $action,
					last_version: $version,
					last_status: $status,
					last_timestamp: $ts
				}' "$STATE_FILE" >"$tmp_state" 2>/dev/null && mv "$tmp_state" "$STATE_FILE"
		else
			jq -n --arg action "$action" \
				--arg version "$version" \
				--arg status "$status" \
				--arg ts "$timestamp" \
				'{
					last_action: $action,
					last_version: $version,
					last_status: $status,
					last_timestamp: $ts
				}' >"$STATE_FILE"
		fi
	fi
	return 0
}

#######################################
# cmd_enable — Install and start the service
#######################################
cmd_enable() {
	ensure_dirs

	local backend
	backend="$(_get_scheduler_backend)"

	if [[ "$backend" != "launchd" ]]; then
		print_error "Linux systemd support not yet implemented. Use 'bun run start' directly."
		return 1
	fi

	local bun_path
	bun_path="$(_find_bun)" || return 1

	local version
	version="$(_get_version)"

	# Create symlink in ~/.aidevops/bin/ (readable name in System Settings)
	ln -sf "${REPO_DIR}/dashboard.sh" "$BIN_LINK"

	# Generate plist content
	local new_content
	new_content=$(_generate_plist "$bun_path" "$REPO_DIR" "${PATH}")

	# Skip if already loaded with identical config
	if _launchd_is_loaded && [[ -f "$LAUNCHD_PLIST" ]]; then
		local existing_content
		existing_content=$(cat "$LAUNCHD_PLIST" 2>/dev/null) || existing_content=""
		if [[ "$existing_content" == "$new_content" ]]; then
			print_info "Dashboard LaunchAgent already installed with identical config ($LABEL)"
			_update_state "enable" "enabled"
			return 0
		fi
		# Config differs — unload first, then reinstall
		log_info "Config changed — reinstalling LaunchAgent"
		launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
		sleep 1
	elif _launchd_is_loaded; then
		# Loaded but no plist file — unload stale entry
		launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
		sleep 1
	fi

	# Write plist
	echo "$new_content" >"$LAUNCHD_PLIST"

	# Load the service
	if launchctl bootstrap "gui/$(id -u)" "$LAUNCHD_PLIST"; then
		_update_state "enable" "enabled"
		log_info "Dashboard service enabled (v${version})"

		print_success "Dashboard service enabled (v${version})"
		echo ""
		echo "  Scheduler:  launchd (macOS LaunchAgent)"
		echo "  Label:      $LABEL"
		echo "  Plist:      $LAUNCHD_PLIST"
		echo "  Server:     ${REPO_DIR}/server/index.ts"
		echo "  Bun:        $bun_path"
		echo "  Logs:       $LOG_FILE"
		echo "  KeepAlive:  true (auto-restart on crash)"
		echo "  RunAtLoad:  true (starts on login)"
		echo ""
		echo "  Disable with: ./dashboard.sh disable"
		echo "  Restart with: ./dashboard.sh restart"
	else
		print_error "Failed to load LaunchAgent: $LABEL"
		log_error "Failed to bootstrap LaunchAgent"
		return 1
	fi
	return 0
}

#######################################
# cmd_disable — Stop and remove the service
#######################################
cmd_disable() {
	local had_entry=false

	if _launchd_is_loaded; then
		had_entry=true
		launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
		log_info "Dashboard service unloaded"
	fi

	if [[ -f "$LAUNCHD_PLIST" ]]; then
		had_entry=true
		rm -f "$LAUNCHD_PLIST"
	fi

	# Remove symlink
	rm -f "$BIN_LINK" 2>/dev/null || true

	_update_state "disable" "disabled"

	if [[ "$had_entry" == "true" ]]; then
		print_success "Dashboard service disabled"
		echo "  Logs preserved at: $LOG_FILE"
	else
		print_info "Dashboard service was not enabled"
	fi
	return 0
}

#######################################
# cmd_restart — Restart the server process
#######################################
cmd_restart() {
	if _launchd_is_loaded; then
		# kickstart -k kills the existing process and restarts it
		launchctl kickstart -k "gui/$(id -u)/${LABEL}"
		log_info "Dashboard service restarted via kickstart"
		print_success "Dashboard service restarted"
		sleep 1
		cmd_status
	elif [[ -f "$LAUNCHD_PLIST" ]]; then
		# Installed but not loaded — bootstrap it
		launchctl bootstrap "gui/$(id -u)" "$LAUNCHD_PLIST"
		log_info "Dashboard service started (was not loaded)"
		print_success "Dashboard service started"
		sleep 1
		cmd_status
	else
		print_error "Service not installed. Run: ./dashboard.sh enable"
		return 1
	fi
	return 0
}

#######################################
# cmd_status — Show service status
#######################################
cmd_status() {
	ensure_dirs

	local version
	version="$(_get_version)"

	echo ""
	echo -e "${WHITE:-}Dashboard Service Status${NC}"
	echo "------------------------"
	echo ""

	local backend
	backend="$(_get_scheduler_backend)"

	if [[ "$backend" == "launchd" ]]; then
		if _launchd_is_loaded; then
			# Get PID from launchctl print (most reliable)
			local pid
			pid="$(launchctl print "gui/$(id -u)/${LABEL}" 2>/dev/null | grep 'pid =' | awk '{print $NF}' || true)"
			if [[ -z "$pid" ]]; then
				pid="$(launchctl list "$LABEL" 2>/dev/null | awk 'NR>1 {print $1}' || true)"
			fi
			pid="${pid:-unknown}"

			local last_exit
			last_exit="$(launchctl print "gui/$(id -u)/${LABEL}" 2>/dev/null | grep 'last exit code' | awk '{print $NF}' || true)"

			echo -e "  Status:     ${GREEN}running${NC} (PID: ${pid})"
			echo "  Version:    v${version}"
			echo "  Label:      $LABEL"
			echo "  Plist:      $LAUNCHD_PLIST"
			echo "  Log:        $LOG_FILE"
			if [[ -n "$last_exit" ]]; then
				echo "  Last exit:  ${last_exit}"
			fi
		elif [[ -f "$LAUNCHD_PLIST" ]]; then
			echo -e "  Status:     ${YELLOW}stopped${NC} (installed but not loaded)"
			echo "  Version:    v${version}"
			echo "  Plist:      $LAUNCHD_PLIST"
			echo "  Log:        $LOG_FILE"
		else
			echo -e "  Status:     ${RED:-}not installed${NC}"
			echo "  Version:    v${version}"
			echo "  Enable with: ./dashboard.sh enable"
		fi
	else
		echo "  Scheduler:  systemd (not yet implemented)"
		echo "  Version:    v${version}"
	fi

	# Show state file info
	if [[ -f "$STATE_FILE" ]] && command -v jq &>/dev/null; then
		local last_action last_ts last_status
		last_action=$(jq -r '.last_action // "none"' "$STATE_FILE" 2>/dev/null)
		last_ts=$(jq -r '.last_timestamp // "never"' "$STATE_FILE" 2>/dev/null)
		last_status=$(jq -r '.last_status // "unknown"' "$STATE_FILE" 2>/dev/null)

		echo ""
		echo "  Last action:  ${last_ts} (${last_action}: ${last_status})"
	fi

	echo ""
	return 0
}

#######################################
# cmd_logs — View server logs
#######################################
cmd_logs() {
	local tail_lines=50

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--tail | -n)
			[[ $# -lt 2 ]] && {
				print_error "--tail requires a value"
				return 1
			}
			tail_lines="$2"
			shift 2
			;;
		--follow | -f)
			tail -f "$LOG_FILE" 2>/dev/null || print_info "No log file yet"
			return 0
			;;
		*) shift ;;
		esac
	done

	if [[ -f "$LOG_FILE" ]]; then
		tail -n "$tail_lines" "$LOG_FILE"
	else
		print_info "No log file yet (dashboard hasn't run)"
	fi
	return 0
}

#######################################
# cmd_help — Show help
#######################################
cmd_help() {
	cat <<'EOF'
dashboard.sh - AiDevOps Dashboard service manager

USAGE:
    ./dashboard.sh <command> [options]

COMMANDS:
    enable              Install and start the LaunchAgent
    disable             Stop and remove the LaunchAgent
    restart             Restart the server (e.g. after update)
    status              Show service status and version
    logs [--tail N]     View server logs (default: last 50 lines)
    logs --follow       Follow log output in real-time
    help                Show this help

HOW IT WORKS:
    The dashboard server runs as a macOS LaunchAgent:
      - KeepAlive: true  — auto-restarts on crash
      - RunAtLoad: true  — starts on login
      - ThrottleInterval: 5s — prevents rapid restart loops

    Updates (via update.sh or the dashboard UI) automatically restart
    the service via launchctl kickstart — no manual restart needed.

SCHEDULER BACKENDS:
    macOS:  launchd LaunchAgent (~/Library/LaunchAgents/com.aidevops.dashboard.plist)
    Linux:  systemd (planned, not yet implemented)

LOGS:
    ~/.aidevops/logs/dashboard.log

EOF
	return 0
}

#######################################
# Main
#######################################
main() {
	local command="${1:-help}"
	shift || true

	case "$command" in
	enable) cmd_enable "$@" ;;
	disable) cmd_disable "$@" ;;
	restart) cmd_restart "$@" ;;
	status) cmd_status "$@" ;;
	logs) cmd_logs "$@" ;;
	help | --help | -h) cmd_help ;;
	*)
		print_error "Unknown command: $command"
		cmd_help
		return 1
		;;
	esac
	return 0
}

main "$@"
