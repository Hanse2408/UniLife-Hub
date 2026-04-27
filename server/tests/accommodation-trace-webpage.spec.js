const { test, expect } = require("@playwright/test");

function futureDate(daysFromNow = 10) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

test("webpage evidence: unauthenticated user cannot create booking", async ({ page }) => {
  await test.step("Open backend API page in browser", async () => {
    await page.goto("http://localhost:5000/");
    await expect(page.locator("body")).toContainText("API is running");
  });

  await test.step("Send booking request without Authorization token from browser", async () => {
    const result = await page.evaluate(async (bookingData) => {
      const response = await fetch("http://localhost:5000/api/accommodation/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      const body = await response.json();

      return {
        status: response.status,
        body,
      };
    }, {
      listingId: "507f1f77bcf86cd799439011",
      moveInDate: futureDate(15),
      visitDate: futureDate(7),
      requestMessage: "I am interested in this room.",
    });

    expect(result.status).toBe(401);
    expect(result.body.success).toBe(false);
    expect(result.body.message).toBe("Unauthorized. Token missing.");
  });
});