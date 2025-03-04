"use client";

const defaultUser = {
    "screen_0_First_0": "Omkar",
    "screen_0_Last_1": "Nilawar",
    "screen_0_Email_2": "omkarnilawar@gmail.com",
    "flow_token": "919370435262"
};

export function loadUsersFromSessionStorage() {
    if (typeof window !== 'undefined') {
        const data = sessionStorage.getItem('registeredUsers');
        return data ? JSON.parse(data) : [defaultUser];
    }
    return [defaultUser];
}

export function saveUsersToSessionStorage(users: any[]) {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('registeredUsers', JSON.stringify(users));
    }
}