// Emergency type declarations to bypass missing dependencies

// Node.js globals
declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  cwd(): string;
  exit(code?: number): never;
  nextTick(callback: Function, ...args: any[]): void;
  hrtime(): [number, number];
  memoryUsage(): { rss: number; heapTotal: number; heapUsed: number; external: number };
  uptime(): number;
};

declare const __dirname: string;
declare const __filename: string;

declare const require: (id: string) => any;
declare const Buffer: {
  from(data: string | number[], encoding?: string): any;
  alloc(size: number): any;
  isBuffer(obj: any): boolean;
};

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
  interface Timeout {
    ref(): this;
    unref(): this;
  }
}

declare module 'perf_hooks' {
  export const performance: {
    now(): number;
    mark(name: string): void;
    measure(name: string, startMark?: string, endMark?: string): void;
    getEntriesByName(name: string): any[];
    clearMarks(): void;
    clearMeasures(): void;
  };
  export class PerformanceObserver {
    constructor(callback: (list: any) => void);
    observe(options: any): void;
    disconnect(): void;
  }
}

declare module 'crypto' {
  export function createHash(algorithm: string): {
    update(data: string): any;
    digest(encoding?: string): string;
  };
  export function randomBytes(size: number): Buffer;
  export function createHmac(algorithm: string, key: string): any;
}

declare module '@nestjs/common' {
  export const Module: any;
  export const Injectable: any;
  export const Controller: any;
  export const Get: any;
  export const Post: any;
  export const Put: any;
  export const Delete: any;
  export const Patch: any;
  export const Body: any;
  export const Param: any;
  export const Query: any;
  export const UseGuards: any;
  export const SetMetadata: any;
  export const createParamDecorator: any;
  export const Logger: any;
  export const HttpException: any;
  export const HttpStatus: any;
  export const BadRequestException: any;
  export const UnauthorizedException: any;
  export const ForbiddenException: any;
  export const NotFoundException: any;
  export const ConflictException: any;
  export const InternalServerErrorException: any;
  export const Inject: any;
  export const Optional: any;
  export const Global: any;
  export const Scope: any;
  export const Type: any;
  export const mixin: any;
  export const REQUEST: any;
  export const LoggerService: any;
  
  export interface LoggerService {
    log(message: any, context?: string): void;
    error(message: any, trace?: string, context?: string): void;
    warn(message: any, context?: string): void;
    debug?(message: any, context?: string): void;
    verbose?(message: any, context?: string): void;
  }
  
  // Interfaces
  export interface ExecutionContext {
    switchToHttp(): any;
    getHandler(): any;
    getClass(): any;
    getArgs(): any[];
    getType(): string;
  }
  
  export interface CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean>;
  }
  
  export interface MiddlewareConsumer {
    apply(...middleware: any[]): any;
  }
  
  export interface NestModule {
    configure(consumer: MiddlewareConsumer): void;
  }
  
  export interface OnModuleInit {
    onModuleInit(): void | Promise<void>;
  }
  
  export interface OnModuleDestroy {
    onModuleDestroy(): void | Promise<void>;
  }
  export const Module: any;
  export const Injectable: any;
  export const Controller: any;
  export const Get: any;
  export const Post: any;
  export const Put: any;
  export const Delete: any;
  export const Patch: any;
  export const Body: any;
  export const Param: any;
  export const Query: any;
  export const UseGuards: any;
  export const SetMetadata: any;
  export const createParamDecorator: any;
  export const ExecutionContext: any;
  export const CanActivate: any;
  export const Logger: any;
  export const HttpException: any;
  export const HttpStatus: any;
  export const BadRequestException: any;
  export const UnauthorizedException: any;
  export const ForbiddenException: any;
  export const NotFoundException: any;
  export const ConflictException: any;
  export const InternalServerErrorException: any;
  export const Inject: any;
  export const Optional: any;
  export const Global: any;
  export const Scope: any;
  export const Type: any;
  export const mixin: any;
  export const REQUEST: any;
}

declare module '@nestjs/core' {
  export const APP_GUARD: any;
  export const APP_INTERCEPTOR: any;
  export const APP_FILTER: any;
  export const ModuleRef: any;
  export const NestFactory: any;
  
  export class Reflector {
    get(metadataKey: any, target: any): any;
    getAllAndOverride(metadataKey: any, targets: any[]): any;
    getAllAndMerge(metadataKey: any, targets: any[]): any;
  }
}

declare module '@nestjs/config' {
  export const ConfigModule: any;
  export function registerAs(token: string, factory: () => any): any;
  export class ConfigService {
    get(key: string): any;
    get(key: string, defaultValue: any): any;
  }
}

declare module '@nestjs/typeorm' {
  export const TypeOrmModule: any;
  export const InjectRepository: any;
  export const getRepositoryToken: any;
  export interface TypeOrmModuleOptions {
    type?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    entities?: any[];
    synchronize?: boolean;
    ssl?: any;
    [key: string]: any;
  }
  export interface TypeOrmOptionsFactory {
    createTypeOrmOptions(): TypeOrmModuleOptions | Promise<TypeOrmModuleOptions>;
  }
}

declare module '@nestjs/throttler' {
  export const ThrottlerModule: any;
  export const ThrottlerGuard: any;
  export const Throttle: any;
}

declare module '@nestjs/schedule' {
  export const ScheduleModule: any;
  export const Cron: any;
  export const CronExpression: any;
  export const SchedulerRegistry: any;
}

declare module '@nestjs/bull' {
  export const BullModule: any;
  export const Process: any;
  export const Processor: any;
  export const InjectQueue: any;
}

declare module '@nestjs/cache-manager' {
  export const CacheModule: any;
  export const CACHE_MANAGER: any;
}

declare module '@nestjs/passport' {
  export const AuthGuard: any;
  export const PassportModule: any;
}

declare module '@nestjs/jwt' {
  export const JwtModule: any;
  export const JwtService: any;
}

declare module '@nestjs/websockets' {
  export const WebSocketGateway: any;
  export const SubscribeMessage: any;
  export const MessageBody: any;
  export const ConnectedSocket: any;
  export const WebSocketServer: any;
}

declare module '@nestjs/platform-socket.io' {
  export const IoAdapter: any;
}

declare module '@nestjs/event-emitter' {
  export const EventEmitterModule: any;
  export const EventEmitter2: any;
  export const OnEvent: any;
}

declare module 'typeorm' {
  export const Entity: any;
  export const Column: any;
  export const PrimaryGeneratedColumn: any;
  export const CreateDateColumn: any;
  export const UpdateDateColumn: any;
  export const Repository: any;
  export const DataSource: any;
  export const OneToMany: any;
  export const ManyToOne: any;
  export const ManyToMany: any;
  export const JoinTable: any;
  export const JoinColumn: any;
  export const Index: any;
  export const Unique: any;
}

declare module 'ioredis' {
  export interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    [key: string]: any;
  }
  
  export default class Redis {
    constructor(options?: RedisOptions);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'>;
    setex(key: string, seconds: number, value: string): Promise<'OK'>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    flushall(): Promise<'OK'>;
    flushdb(): Promise<'OK'>;
    ping(): Promise<'PONG'>;
    quit(): Promise<'OK'>;
    info(section?: string): Promise<string>;
    call(command: string, ...args: any[]): Promise<any>;
    pipeline(): any;
    eval(script: string, numKeys: number, ...args: any[]): Promise<any>;
  }
}

declare module 'cache-manager-redis-store' {
  export const redisStore: any;
}

declare module 'bull' {
  export default class Queue {
    constructor(name: string, opts?: any);
    add(name: string, data: any, opts?: any): Promise<any>;
    process(name: string, handler: any): void;
    process(handler: any): void;
    on(event: string, handler: any): void;
  }
}

declare module 'stripe' {
  export default class Stripe {
    constructor(key: string, options?: any);
    webhooks: {
      constructEvent(payload: any, signature: string, secret: string): any;
    };
  }
}

declare module 'socket.io' {
  export class Server {
    constructor(server?: any, options?: any);
    on(event: string, handler: any): void;
    emit(event: string, data?: any): void;
    to(room: string): any;
    use(middleware: any): void;
  }
}

declare module 'bcryptjs' {
  export function hash(data: string, saltOrRounds: number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
}

declare module 'jsonwebtoken' {
  export function sign(payload: any, secret: string, options?: any): string;
  export function verify(token: string, secret: string, options?: any): any;
  export function decode(token: string, options?: any): any;
}

declare module 'passport' {
  export const Strategy: any;
}

declare module 'passport-jwt' {
  export const Strategy: any;
  export const ExtractJwt: any;
}

declare module 'passport-local' {
  export const Strategy: any;
}

declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
}

declare module 'speakeasy' {
  export function generateSecret(options?: any): any;
  export function totp(options: any): string;
  export function totp_verify(options: any): boolean;
}

declare module 'winston' {
  export function createLogger(options?: any): any;
  export const format: any;
  export const transports: any;
}

declare module 'nest-winston' {
  export const WinstonModule: any;
}

declare module 'compression' {
  export default function compression(options?: any): any;
}

declare module 'helmet' {
  export default function helmet(options?: any): any;
}

declare module 'cors' {
  export default function cors(options?: any): any;
}

declare module 'cookie-parser' {
  export default function cookieParser(secret?: string, options?: any): any;
}

declare module 'express-rate-limit' {
  export default function rateLimit(options?: any): any;
}

declare module 'handlebars' {
  export function compile(template: string): (context: any) => string;
}

declare module 'nodemailer' {
  export function createTransporter(options: any): any;
}

declare module 'node-cron' {
  export function schedule(cronExpression: string, task: () => void): any;
}

declare module 'puppeteer' {
  export function launch(options?: any): Promise<any>;
}

declare module 'exceljs' {
  export class Workbook {
    addWorksheet(name: string): any;
    xlsx: {
      writeBuffer(): Promise<Buffer>;
    };
  }
}

declare module 'rxjs' {
  export class Observable<T> {
    constructor(subscriber?: (observer: any) => void);
    subscribe(observer?: any): any;
    pipe(...operations: any[]): Observable<any>;
  }
  export class Subject<T> extends Observable<T> {
    next(value: T): void;
    error(error: any): void;
    complete(): void;
  }
  export function of<T>(...items: T[]): Observable<T>;
  export function from<T>(input: any): Observable<T>;
  export function timer(initialDelay: number, period?: number): Observable<number>;
  export function throwError(error: any): Observable<never>;
}

declare module 'rxjs/operators' {
  export function map<T, R>(project: (value: T) => R): any;
  export function filter<T>(predicate: (value: T) => boolean): any;
  export function catchError<T>(selector: (err: any) => Observable<T>): any;
  export function tap<T>(nextOrObserver: (value: T) => void): any;
  export function switchMap<T, R>(project: (value: T) => Observable<R>): any;
  export function mergeMap<T, R>(project: (value: T) => Observable<R>): any;
  export function debounceTime<T>(dueTime: number): any;
  export function distinctUntilChanged<T>(): any;
  export function takeUntil<T>(notifier: Observable<any>): any;
  export function startWith<T>(...values: T[]): any;
  export function finalize<T>(callback: () => void): any;
}

declare module 'express' {
  export interface Request {
    body: any;
    params: any;
    query: any;
    headers: any;
    method: string;
    url: string;
    path: string;
    ip: string;
    user?: any;
    raw?: Buffer;
    [key: string]: any;
  }
  export interface Response {
    status(code: number): Response;
    json(obj: any): Response;
    send(body?: any): Response;
    cookie(name: string, value: string, options?: any): Response;
    clearCookie(name: string, options?: any): Response;
    redirect(url: string): void;
    locals: any;
    [key: string]: any;
  }
  export interface NextFunction {
    (err?: any): void;
  }
  export interface Application {
    use(...args: any[]): Application;
    get(path: string, ...handlers: any[]): Application;
    post(path: string, ...handlers: any[]): Application;
    put(path: string, ...handlers: any[]): Application;
    delete(path: string, ...handlers: any[]): Application;
    listen(port: number, callback?: () => void): any;
    [key: string]: any;
  }
  export function Router(): any;
  export const raw: any;
}

declare module '@nestjs/swagger' {
  export const ApiTags: any;
  export const ApiOperation: any;
  export const ApiResponse: any;
  export const ApiProperty: any;
  export const ApiParam: any;
  export const ApiQuery: any;
  export const ApiHeader: any;
  export const ApiBody: any;
  export const ApiBearerAuth: any;
  export const DocumentBuilder: any;
  export const SwaggerModule: any;
}