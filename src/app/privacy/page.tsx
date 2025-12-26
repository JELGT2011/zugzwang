import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="container max-w-4xl mx-auto px-4 py-12">
            <div className="mb-8">
                <Link href="/">
                    <Button variant="ghost" className="mb-4">
                        ← Back to Home
                    </Button>
                </Link>
                <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: December 26, 2025</p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>1. Introduction</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        Welcome to Zugzwang ("we," "our," or "us"). We are committed to protecting your personal
                        information and your right to privacy. This Privacy Policy explains how we collect, use,
                        disclose, and safeguard your information when you use our Service.
                    </p>
                    <p>
                        Please read this privacy policy carefully. If you do not agree with the terms of this privacy
                        policy, please do not access the Service.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>2. Information We Collect</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <h4 className="font-semibold mt-4 mb-2">Personal Information</h4>
                    <p>
                        When you create an account, we collect the following information from your OAuth provider
                        (e.g., Google):
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Name</li>
                        <li>Email address</li>
                        <li>Profile picture</li>
                    </ul>

                    <h4 className="font-semibold mt-4 mb-2">Usage Data</h4>
                    <p>We automatically collect certain information when you use our Service, including:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Chess games you play</li>
                        <li>Puzzles you solve</li>
                        <li>Openings you study</li>
                        <li>Performance statistics and ratings</li>
                        <li>Device information and IP address</li>
                        <li>Browser type and version</li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>3. How We Use Your Information</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Provide, operate, and maintain our Service</li>
                        <li>Improve, personalize, and expand our Service</li>
                        <li>Understand and analyze how you use our Service</li>
                        <li>Develop new products, services, features, and functionality</li>
                        <li>Provide you with AI-powered chess coaching and analysis</li>
                        <li>Track your progress and performance over time</li>
                        <li>Communicate with you, either directly or through our partners</li>
                        <li>Send you updates and other information relating to the Service</li>
                        <li>Find and prevent fraud</li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>4. Data Storage and Security</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        We use administrative, technical, and physical security measures to help protect your personal
                        information. While we have taken reasonable steps to secure the personal information you provide
                        to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.
                    </p>
                    <p>
                        Your data is stored securely and encrypted both in transit and at rest. We use industry-standard
                        security protocols to protect your information.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>5. Third-Party Services</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>We use the following third-party services:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>
                            <strong>Google OAuth:</strong> For authentication. Your login information is handled by Google
                            and we only receive basic profile information.
                        </li>
                        <li>
                            <strong>Stockfish:</strong> An open-source chess engine that runs locally in your browser for
                            game analysis.
                        </li>
                        <li>
                            <strong>OpenAI:</strong> For AI-powered chess coaching. Game data may be sent to OpenAI's
                            servers to provide coaching insights.
                        </li>
                    </ul>
                    <p>
                        These third parties have their own privacy policies addressing how they use such information.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>6. Cookies and Tracking Technologies</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        We use cookies and similar tracking technologies to track activity on our Service and store
                        certain information. Cookies are files with a small amount of data which may include an anonymous
                        unique identifier.
                    </p>
                    <p>
                        You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                        However, if you do not accept cookies, you may not be able to use some portions of our Service.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>7. Your Privacy Rights</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>You have the right to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Access the personal information we hold about you</li>
                        <li>Request correction of inaccurate data</li>
                        <li>Request deletion of your personal information</li>
                        <li>Object to processing of your personal information</li>
                        <li>Request transfer of your personal information</li>
                        <li>Withdraw consent at any time</li>
                    </ul>
                    <p>
                        To exercise these rights, please contact us through the Service. We will respond to your request
                        within 30 days.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>8. Children's Privacy</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        Our Service is not intended for children under 13 years of age. We do not knowingly collect
                        personally identifiable information from children under 13. If you are a parent or guardian and
                        you are aware that your child has provided us with personal information, please contact us.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>9. Changes to This Privacy Policy</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting
                        the new Privacy Policy on this page and updating the "Last updated" date.
                    </p>
                    <p>
                        You are advised to review this Privacy Policy periodically for any changes. Changes to this
                        Privacy Policy are effective when they are posted on this page.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>10. Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        If you have any questions about this Privacy Policy, please contact us through the Service or via
                        our website contact form.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

