import Image from "next/image";

interface LogoProps {
    className?: string;
    size?: number;
}

export function Logo({ className, size = 32 }: LogoProps) {
    // For now, always using dark logo as per user instruction.
    // In the future, this can be updated to use next-themes or similar.
    return (
        <Image
            src="/logo-dark.webp"
            alt="Zugzwang Logo"
            width={size}
            height={size}
            className={className}
            priority
        />
    );
}
