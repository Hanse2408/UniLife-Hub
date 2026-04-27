const { test, expect } = require("@playwright/test");

function futureDate(daysFromNow = 10) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

test.describe("Accommodation Booking Authentication Tests", () => {
  test("unauthenticated user cannot create booking", async ({ request }) => {
    let response;
    let body;

    await test.step("Send booking request without Authorization token", async () => {
      response = await request.post("/api/accommodation/bookings", {
        data: {
          listingId: "507f1f77bcf86cd799439011",
          moveInDate: futureDate(15),
          visitDate: futureDate(7),
          requestMessage: "I am interested in this room.",
        },
      });
    });

    await test.step("Verify API returns 401 Unauthorized", async () => {
      expect(response.status()).toBe(401);
    });

    await test.step("Verify response message says token is missing", async () => {
      body = await response.json();

      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized. Token missing.");
    });
  });
});