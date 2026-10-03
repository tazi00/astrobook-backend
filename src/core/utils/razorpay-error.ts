import { AppError } from '@/core/errors'

// Razorpay SDK errors plain objects hote hain ({ statusCode, error: { code,
// description } }) — `Error` instance nahi, `.message` bhi nahi. Unhe seedha
// throw karne par error handler ko asli wajah nahi milti. Yahan unhe AppError
// mein badalte hain taaki client ko saaf message mile.
export function toRazorpayAppError(err: unknown): AppError {
  const e = err as any
  if (e instanceof AppError) return e
  const description: string =
    e?.error?.description || e?.description || e?.message || 'Unknown gateway error'
  return new AppError('INTERNAL_ERROR', `Payment gateway error: ${description}`)
}
