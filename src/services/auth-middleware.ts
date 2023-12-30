import { config } from "@gateway/config";
import { BadRequestError, IAuthPayload, NotAuthorizedError } from "@vmdt/9-jobber-shared";
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";

class AuthMiddleware {
    public verifyUser(req: Request, _res: Response, next: NextFunction) {
        if (!req.session?.jwt) {
            throw new NotAuthorizedError('Token is not available. Please login again', 'Gateway Service verifyUser() method error');
        }
        try {
            const payload: IAuthPayload = verify(req.session?.jwt, `${config.JWT_TOKEN}`) as IAuthPayload;
            req.currentUser = payload;
        } catch (error) {
            throw new NotAuthorizedError('Token is not available. Please login again', 'Gateway Service verifyUser() method invalid token');
        }
        next();
    }

    public checkAuthentication(req: Request, _res: Response, next: NextFunction) {
        if (!req.currentUser)
            throw new BadRequestError('Authentication is required to access routes', 'Gateway Service checkAuthentication() method error');
        next();
    }
}

export const authMiddleware: AuthMiddleware = new AuthMiddleware();