import Script from "next/script";

type GoogleAnalyticsProps = {
  measurementId?: string;
};

export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const id = measurementId ?? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${id}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
