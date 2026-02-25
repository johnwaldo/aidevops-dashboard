import { authenticate } from "../middleware/auth";
import { apiResponse } from "./_helpers";

export async function handleAuthStatus(req: Request): Promise<Response> {
  const auth = authenticate(req);

  return apiResponse(
    {
      authenticated: auth.authenticated,
      user: auth.user,
      method: auth.method,
    },
    "auth",
    0
  );
}
