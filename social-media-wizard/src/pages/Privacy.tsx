export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl py-12 px-4 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. Who We Are</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Blake Mill Social Media Wizard ("the App") is operated by Blake Mill, a UK-based business.
          The App helps Shopify merchants manage their social media presence across Facebook, Instagram,
          Google Ads, TikTok, Snapchat, and LinkedIn through AI-powered content generation, automated
          publishing, and performance optimisation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. Data We Collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">When you connect your accounts, we collect and store:</p>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li><strong>Facebook/Instagram:</strong> Page names, Page IDs, ad account IDs, page access tokens, engagement metrics (likes, comments, reach), and ad performance data (spend, impressions, conversions).</li>
          <li><strong>Shopify:</strong> Product catalogue data (titles, descriptions, prices, images, inventory levels), order data (for conversion tracking), and customer segment data.</li>
          <li><strong>Account information:</strong> Your name and email address from social platform login.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We do not collect or store passwords. Authentication is handled via OAuth through each platform's official API.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Data</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Generate and publish social media content to your connected pages and accounts</li>
          <li>Create, manage, and optimise ad campaigns on your behalf</li>
          <li>Monitor and respond to comments and engagement on your posts</li>
          <li>Display performance metrics and analytics in your dashboard</li>
          <li>Trigger contextual campaigns based on weather, events, and inventory changes</li>
          <li>Sync your Shopify product catalogue for use in campaigns</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">4. Data Storage & Security</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your data is stored securely on Supabase (PostgreSQL) with row-level security policies.
          Access tokens are stored encrypted. All data is transmitted over HTTPS. Our application
          is hosted on Vercel with enterprise-grade infrastructure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">5. Data Sharing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We do not sell, rent, or share your data with third parties. Data is only transmitted to:
        </p>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Meta (Facebook/Instagram) — to publish content and manage ads on your behalf</li>
          <li>Shopify — to sync product data from your store</li>
          <li>Anthropic (Claude API) — to generate content using AI (no personal data is sent, only product information)</li>
          <li>WeatherAPI, PredictHQ, Ticketmaster — to check weather and event data for contextual triggers (no personal data is sent)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your data for as long as your account is active. When you disconnect a platform
          or delete your account, we remove the associated access tokens immediately. Campaign
          performance data is retained for up to 12 months for analytics purposes, after which
          it is automatically deleted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">Under UK GDPR, you have the right to:</p>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Access the data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Disconnect any platform at any time from the Channels page</li>
          <li>Export your data</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">8. Data Deletion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can disconnect any connected account at any time from the Channels page in the app.
          This immediately revokes our access and deletes stored tokens. To request complete
          deletion of all your data, contact us at the email below.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For any privacy-related questions or data requests, contact:<br />
          <strong>Email:</strong> hi@designedforhumans.tech
        </p>
      </section>
    </div>
  )
}
