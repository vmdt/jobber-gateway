import { CustomError, IErrorResponse, winstonLogger } from "@vmdt/9-jobber-shared";
import { Logger } from "winston";
import { config } from "@gateway/config";
import { Application, NextFunction, Request, Response, json, urlencoded } from "express";
import cookieSession from "cookie-session";
import hpp from "hpp";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import http from 'http';
import { StatusCodes } from "http-status-codes";
import { elasticSearch } from "./elasticsearch";
import { appRoutes } from "./routes";

const SERVER_PORT = 4000;

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'gatewayServer', 'debug');

export class GatewayServer {
    private app: Application;

    constructor(app: Application) {
        this.app = app;
    }

    public start(): void {
        this.securityMiddleware(this.app);
        this.standardMiddleware(this.app);
        this.routesMiddleware(this.app);
        this.errorHandler(this.app);
        this.startServer(this.app);
        this.startElasticSearch();
    }

    private securityMiddleware(app: Application): void {
        app.set('trust proxy', 1);
        app.use(
            cookieSession({
                name: 'session',
                keys: [`${config.SECRET_KEY_ONE}`, `${config.SECRET_KEY_TWO}`],
                maxAge: 7 * 24 * 3600000,
                secure: config.NODE_ENV !== 'development',
                ...(config.NODE_ENV !== 'development' && {
                    sameSite: 'none'
                })
            })
        );
        app.use(hpp());
        app.use(helmet());
        app.use(cors({
            origin: config.CLIENT_URL,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        }));
    }

    private standardMiddleware(app: Application): void {
        app.use(compression());
        app.use(json({ limit: '200mb' }));
        app.use(urlencoded({ extended: true, limit: '200mb' }));
    }

    private routesMiddleware(app: Application): void {
        appRoutes(app);
    }

    private errorHandler(app: Application): void {
        app.use('*', (req: Request, res: Response, next: NextFunction) => {
            const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
            log.log('error', `${fullUrl} endpoint does not exist.`, '');
            res.status(StatusCodes.NOT_FOUND).json({ message: 'The endpoint called does not exist.' });
            next();
        });

        app.use((err: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
            if (err instanceof CustomError) {
                log.log('error', `GatewayService ${err.comingFrom}:`, err);
                res.status(err.statusCode).json(err.serializeError());
            }

            next();
        })
    }

    private startElasticSearch(): void {
        elasticSearch.checkConnection();
    }

    private startServer(app: Application): void {
        try {
            const httpServer: http.Server = new http.Server(app);
            httpServer.listen(SERVER_PORT, () => {
                log.info(`Gateway server running on port ${SERVER_PORT}`);
            });
        } catch (error) {
            log.log('error', 'GatewayService startServer() error method:', error);
        }
    }
}
