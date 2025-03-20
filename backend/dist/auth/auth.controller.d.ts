import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: {
        username: string;
        password: string;
    }): Promise<{
        access_token: string;
    }>;
    verify2FA(body: {
        token: string;
        secret: string;
    }): Promise<{
        message: string;
    }>;
}
