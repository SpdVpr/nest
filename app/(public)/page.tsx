// This is a route group - redirect to main page
import { redirect } from 'next/navigation'

export default function PublicPage() {
  redirect('/')
}