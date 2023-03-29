import { Callback, Context, PreAuthenticationTriggerEvent } from 'aws-lambda'

export async function handler(
  event: PreAuthenticationTriggerEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  console.log(event)

  if (event.request.userAttributes.email === 'vitorluigiorsini@gmail.com') {
    callback('This user is blocked. Reason: TEST', event)
  } else {
    callback(null, event)
  }
}
