export const getApiUrl = () =>
    process.env.NEXT_PUBLIC_API_URL
    || `${window.location.protocol}//${window.location.hostname}:4000`;
