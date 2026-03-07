import { google } from 'googleapis'
import { env } from '@/config/env'

export interface MeetEventResult {
  meetLink: string
  eventId: string
}

/**
 * Creates a Google Calendar event with an auto-generated Google Meet link.
 *
 * Prerequisites:
 *  - Google Cloud project with Calendar API enabled
 *  - Service account with "calendar.events" scope
 *  - GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in env
 *  - GOOGLE_CALENDAR_ID (defaults to 'primary')
 */
export class GoogleMeetService {
  private readonly calendar

  constructor() {
    const auth = new google.auth.JWT({
      email: env.GOOGLE_CLIENT_EMAIL,
      key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    this.calendar = google.calendar({ version: 'v3', auth })
  }

  async createMeeting(params: {
    title: string
    startTime: Date
    endTime: Date
    attendeeEmails: string[]
    requestId: string // unique per request to prevent duplicates
  }): Promise<MeetEventResult> {
    const { title, startTime, endTime, attendeeEmails, requestId } = params

    const response = await this.calendar.events.insert({
      calendarId: env.GOOGLE_CALENDAR_ID,
      conferenceDataVersion: 1,
      requestBody: {
        summary: title,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        attendees: attendeeEmails.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      },
    })

    const eventData = response.data
    const entryPoints = eventData.conferenceData?.entryPoints ?? []
    const videoEntry = entryPoints.find((ep) => ep.entryPointType === 'video')

    if (!videoEntry?.uri) {
      throw new Error('Google Meet link was not generated. Check Calendar API conferenceData setup.')
    }

    return {
      meetLink: videoEntry.uri,
      eventId: eventData.id ?? '',
    }
  }

  async cancelEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId,
    })
  }
}
