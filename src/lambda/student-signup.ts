import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

/** Retired public entry point. Current K–8 provisioning uses the adult roster. */
export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 200, headers, body: "" };
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: "adult_provisioning_required" }),
  };
}
