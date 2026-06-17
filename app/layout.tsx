export const metadata = {
  title: 'ZOE',
  description: 'ZOE - WhatsApp agent for coffee and Phaneroo Ministries',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
