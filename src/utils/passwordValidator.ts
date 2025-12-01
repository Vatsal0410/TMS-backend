export const validatePasswordStrength = (password: string): string | null => {
    if(password.length < 8) {
        return 'Password must be at least 8 characters long.'
    }

    if(!/(?=.*[a-z])/.test(password)) {
        return 'Password must contain at least one lowercase letter.'
    }
    if(!/(?=.*[A-Z])/.test(password)) {
        return 'Password must contain at least one uppercase letter.'
    }
    if(!/(?=.*\d)/.test(password)) {
        return 'Password must contain at least one number.'
    }
    if(!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
        return 'Password must contain at least one special character.'
    }
    
    const commonPasswords = ['password', '12345678', 'admin123', 'qwerty']

    if(commonPasswords.includes(password.toLowerCase())) {
        return 'Password is too common. Please choose a stronger password.'
    }

    return null
}