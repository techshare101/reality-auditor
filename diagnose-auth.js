// Run this in your browser console on the login page to diagnose auth issues

console.log("=== Firebase Auth Diagnostics ===");
console.log("Current URL:", window.location.href);
console.log("Current hostname:", window.location.hostname);
console.log("Current protocol:", window.location.protocol);
console.log("Current port:", window.location.port || "(default)");

// Check if Firebase is loaded
if (typeof window.firebase !== 'undefined') {
    console.log("✓ Firebase is loaded");
    
    // Check auth instance
    const auth = firebase.auth();
    console.log("✓ Auth instance created");
    
    // Check current user
    console.log("Current user:", auth.currentUser);
    
    // Try to get auth domain
    if (auth.app && auth.app.options) {
        console.log("Auth domain configured:", auth.app.options.authDomain);
    }
} else {
    console.log("✗ Firebase not found in window object");
}

// Check for common issues
console.log("\n=== Common Issues Check ===");

// Check if running on HTTPS when it should be HTTP
if (window.location.protocol === 'https:' && window.location.hostname === 'localhost') {
    console.warn("⚠️  You're using HTTPS with localhost. Try HTTP instead.");
}

// Check for mixed content
if (window.location.protocol === 'https:') {
    const httpResources = Array.from(document.querySelectorAll('[src^="http:"], [href^="http:"]'));
    if (httpResources.length > 0) {
        console.warn("⚠️  Mixed content detected. HTTPS page loading HTTP resources.");
    }
}

// Log all errors
window.addEventListener('error', (e) => {
    console.error("Page error:", e.message, e);
});

// Intercept Firebase auth errors
if (typeof window.firebase !== 'undefined') {
    const originalSignIn = firebase.auth.GoogleAuthProvider.prototype.signIn;
    firebase.auth.GoogleAuthProvider.prototype.signIn = function(...args) {
        console.log("Google Sign-In attempted with args:", args);
        return originalSignIn.apply(this, args).catch(error => {
            console.error("Detailed auth error:", {
                code: error.code,
                message: error.message,
                details: error.details,
                email: error.email,
                credential: error.credential
            });
            throw error;
        });
    };
}

console.log("\n=== End Diagnostics ===");
