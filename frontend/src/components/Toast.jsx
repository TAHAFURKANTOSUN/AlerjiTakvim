import { useState, useEffect } from 'react';
import './Toast.css';

let toastTimer = null;
let setGlobalToast = null;

export function showToast(message) {
    if (setGlobalToast) {
        setGlobalToast(message);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setGlobalToast(''), 2500);
    }
}

export default function Toast() {
    const [message, setMessage] = useState('');

    useEffect(() => {
        setGlobalToast = setMessage;
        return () => { setGlobalToast = null; };
    }, []);

    return (
        <div className={`toast ${message ? 'show' : ''}`}>
            {message}
        </div>
    );
}
