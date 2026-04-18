export default function Terms() {
  return (
    <div className="mx-auto max-w-2xl py-12 px-4 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. Service Description</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Blake Mill Social Media Wizard ("the App") is a social media management platform that
          helps merchants create, schedule, publish, and optimise social media content and
          advertising campaigns across multiple platforms including Facebook, Instagram, Google Ads,
          TikTok, Snapchat, and LinkedIn.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. Account & Access</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>You must be authorised to manage the social media accounts and ad accounts you connect.</li>
          <li>You are responsible for maintaining the security of your login credentials.</li>
          <li>You may connect multiple accounts across multiple platforms.</li>
          <li>You can disconnect any account at any time from the Channels page.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. Content & Publishing</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>The App generates content using AI (Anthropic's Claude). All generated content is presented for your review before publishing unless you enable auto-approval.</li>
          <li>You are ultimately responsible for all content published through your connected accounts.</li>
          <li>You must ensure content complies with each platform's community guidelines and advertising policies.</li>
          <li>The App does not guarantee any specific performance results (engagement, conversions, ROAS).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">4. Advertising & Budget</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>When you connect ad accounts, the App may create, modify, pause, or scale advertising campaigns on your behalf based on rules you configure.</li>
          <li>You are responsible for setting appropriate budget limits. The App will respect the budget caps you configure.</li>
          <li>Ad spend is charged directly by the advertising platform (Meta, Google, etc.), not by the App.</li>
          <li>The AI Media Buyer feature automates bid and budget adjustments. You can disable automation at any time.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">5. Shopify Integration</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>The App accesses your Shopify store data (products, inventory, orders) via the Shopify Admin API.</li>
          <li>Product data is used to generate social media content and track campaign performance.</li>
          <li>The App does not modify your Shopify store, products, or orders — it only reads data.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. Data & Privacy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your use of the App is also governed by our{' '}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>,
          which describes how we collect, use, and protect your data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The App is provided "as is" without warranty of any kind. We are not liable for any
          losses arising from the use of the App, including but not limited to: advertising spend,
          content published in error, account suspensions by third-party platforms, or loss of data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">8. Termination</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You may stop using the App at any time by disconnecting all accounts and ceasing use.
          We may suspend or terminate access if you violate these terms or use the App in a way
          that could harm other users or third-party platforms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">9. Governing Law</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These terms are governed by the laws of England and Wales.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For questions about these terms, contact:<br />
          <strong>Email:</strong> hi@designedforhumans.tech
        </p>
      </section>
    </div>
  )
}
