import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="container max-w-4xl mx-auto px-4 py-12">
            <div className="mb-8">
                <Link href="/">
                    <Button variant="ghost" className="mb-4">
                        ← Back to Home
                    </Button>
                </Link>
                <h1 className="text-4xl font-bold mb-2">Terms of Use</h1>
                <p className="text-muted-foreground">Last updated: December 26, 2025</p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>1. Acceptance of Terms</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        By accessing and using Zugzwang ("the Service"), you accept and agree to be bound by the terms
                        and provision of this agreement. If you do not agree to abide by the above, please do not use
                        this service.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>2. Use License</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        Permission is granted to temporarily use Zugzwang for personal, non-commercial use only. This is
                        the grant of a license, not a transfer of title, and under this license you may not:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Modify or copy the materials</li>
                        <li>Use the materials for any commercial purpose</li>
                        <li>Attempt to decompile or reverse engineer any software contained on Zugzwang</li>
                        <li>Remove any copyright or other proprietary notations from the materials</li>
                        <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>3. User Accounts</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        When you create an account with us, you must provide accurate, complete, and current information.
                        Failure to do so constitutes a breach of the Terms, which may result in immediate termination of
                        your account.
                    </p>
                    <p>
                        You are responsible for safeguarding the password and for all activities that occur under your
                        account. You agree not to disclose your password to any third party and to notify us immediately
                        if your password is lost, stolen, or otherwise compromised.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>4. Intellectual Property</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        The Service and its original content (excluding content provided by users), features, and
                        functionality are and will remain the exclusive property of Zugzwang and its licensors. The
                        Service is protected by copyright, trademark, and other laws.
                    </p>
                    <p>
                        Zugzwang uses the Stockfish chess engine, which is open source and licensed under GPL v3. We
                        acknowledge and respect the rights of the Stockfish developers.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>5. Prohibited Uses</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>You may not use the Service:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>In any way that violates any applicable national or international law or regulation</li>
                        <li>To transmit, or procure the sending of, any advertising or promotional material</li>
                        <li>To impersonate or attempt to impersonate Zugzwang, a Zugzwang employee, another user, or any other person or entity</li>
                        <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
                        <li>To use automated systems or software to extract data from the Service for commercial purposes ("screen scraping")</li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>6. Disclaimer</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        The materials on Zugzwang are provided on an "as is" basis. Zugzwang makes no warranties,
                        expressed or implied, and hereby disclaims and negates all other warranties including, without
                        limitation, implied warranties or conditions of merchantability, fitness for a particular purpose,
                        or non-infringement of intellectual property or other violation of rights.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>7. Limitations</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        In no event shall Zugzwang or its suppliers be liable for any damages (including, without
                        limitation, damages for loss of data or profit, or due to business interruption) arising out of
                        the use or inability to use Zugzwang, even if Zugzwang or a Zugzwang authorized representative
                        has been notified orally or in writing of the possibility of such damage.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>8. Modifications</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        Zugzwang may revise these terms of service at any time without notice. By using this Service you
                        are agreeing to be bound by the then current version of these terms of service.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>9. Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        If you have any questions about these Terms, please contact us through the Service or via our
                        website contact form.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

