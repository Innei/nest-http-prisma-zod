import { isJWT } from 'class-validator'

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'

import { AuthService } from '~/modules/auth/auth.service'
import { ConfigsService } from '~/modules/configs/configs.service'
import { UserService } from '~/modules/user/user.service'
import { getNestExecutionContextRequest } from '~/transformers/get-req.transformer'

/**
 * JWT auth guard
 */

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    protected readonly authService: AuthService,
    protected readonly configs: ConfigsService,

    @Inject(UserService) private readonly userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<any> {
    const request = this.getRequest(context)

    const query = request.query as any
    const headers = request.headers
    const Authorization: string =
      headers.authorization || headers.Authorization || query.token

    if (!Authorization) {
      throw new UnauthorizedException('未登录')
    }

    if (this.authService.isCustomToken(Authorization)) {
      const isValid = await this.authService.verifyCustomToken(Authorization)
      if (!isValid) {
        throw new UnauthorizedException('令牌无效')
      }
      const owner = await this.userService.getOwner()
      request.owner = owner
      request.token = Authorization
      return true
    }

    const jwt = Authorization.replace(/[Bb]earer /, '')

    if (!isJWT(jwt)) {
      throw new UnauthorizedException('令牌无效')
    }
    const ok = await this.authService.jwtServicePublic.verify(jwt)
    if (!ok) {
      throw new UnauthorizedException('身份过期')
    }

    const owner = await this.userService.getOwner()
    request.owner = owner
    request.token = jwt
    return true
  }

  getRequest(context: ExecutionContext) {
    return getNestExecutionContextRequest(context)
  }
}