import { NextRequest, NextResponse } from 'next/server';

let registeredUsers: any[] = [{
    "screen_0_First_0": "Omkar",
    "screen_0_Last_1": "Nilawar",
    "screen_0_Email_2": "omkarnilawar@gmail.com",
    "flow_token": "919370435262"
}];

export async function GET(req: NextRequest) {
    return NextResponse.json(registeredUsers);
}

export async function POST(req: NextRequest) {
    const newUser = await req.json();
    registeredUsers.push(newUser);
    return NextResponse.json(newUser, { status: 201 });
}