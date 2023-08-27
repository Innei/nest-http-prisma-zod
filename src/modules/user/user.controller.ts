import { ZodSerializerDto } from 'nestjs-zod'
import { z } from 'zod'

import { Body, Controller, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { UserModel } from '~/schemas'

import { AuthService } from '../auth/auth.service'
import { UserLoginDto } from './dtos/login.dto'
import { UserRegisterDto } from './dtos/register.dto'
import { UserService } from './user.service'

@Controller(['master', 'user'])
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('/login')
  @Throttle(1, 3)
  @ZodSerializerDto(
    UserModel.omit({
      password: true,
    }).extend({
      auth_token: z.string(),
    }),
  )
  async login(@Body() body: UserLoginDto) {
    const { username, password } = body
    const user = await this.authService.validateUsernameAndPassword(
      username,
      password,
    )
    const jwt = await this.authService.signToken(user.id)

    return {
      auth_token: jwt,
      ...user,
    }
  }

  @Post('/register')
  @ZodSerializerDto(
    UserModel.omit({
      password: true,
    }).extend({
      auth_token: z.string(),
    }),
  )
  async register(@Body() body: UserRegisterDto) {
    const newUser = await this.userService.register(body)

    const jwt = await this.authService.signToken(newUser.id)
    return {
      auth_token: jwt,
      ...newUser,
    }
  }
}
