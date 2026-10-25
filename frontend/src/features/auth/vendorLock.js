// A seller (vendor) account works only inside its own dashboard, /seller and the pages below it.
// Any other address (home, marketplace, weather...) sends the seller back to the dashboard.
export const isVendorLocked = (user, pathname) => user?.role === 'vendor' && !(pathname === '/seller' || pathname.startsWith('/seller/'));
