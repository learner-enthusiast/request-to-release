import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '../ui/avatar'

export default function AvatarWithBadge({
    src,
    alt,
    badgeColor,
}: {
    src: string
    alt: string
    badgeColor: string
}) {
    return (
        <Avatar className="cursor-pointer">
            <AvatarImage src={src} alt={alt} />
            <AvatarFallback>RTR</AvatarFallback>
            <AvatarBadge className="bg-green-600 dark:bg-green-800" />
        </Avatar>
    )
}
