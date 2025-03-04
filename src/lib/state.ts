const defaultUser = {
    "screen_0_First_0": "Omkar",
    "screen_0_Last_1": "Nilawar",
    "screen_0_Email_2": "omkarnilawar@gmail.com",
    "flow_token": "919370435262"
};

let registeredUsers: any[] = loadUsersFromLocalStorage();

function loadUsersFromLocalStorage() {
    if (typeof window !== 'undefined') {
        const data = localStorage.getItem('registeredUsers');
        return data ? JSON.parse(data) : [defaultUser];
    }
    return [defaultUser];
}

function saveUsersToLocalStorage() {
    if (typeof window !== 'undefined') {
        console.log('Saving users to local storage:', registeredUsers);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }
}

export function addUser(user: any) {
    console.log('Adding user:', user);
    registeredUsers.push(user);
    saveUsersToLocalStorage();
}

export function getUsers() {
    return registeredUsers;
}

export function clearUsers() {
    registeredUsers = [defaultUser];
    saveUsersToLocalStorage();
}

export function removeUser(flowToken: string) {
    registeredUsers = registeredUsers.filter(user => user.flow_token !== flowToken);
    if (registeredUsers.length === 0) {
        registeredUsers = [defaultUser];
    }
    saveUsersToLocalStorage();
}
