"use server"

export async function saveSessionToCalendar(session: {
  title: string
  time: string
  room: string
  speakers: string[]
  description: string
}) {
  // Simulate saving to calendar (sleep for 2 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // In a real implementation, this would generate and save an iCal event
  console.log("[v0] Saved session to calendar:", session.title)

  return { success: true }
}
