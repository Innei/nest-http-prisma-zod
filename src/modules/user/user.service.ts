import { compareSync, hashSync } from 'bcrypt'
import { nanoid } from 'nanoid'

import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common'

import { BizException } from '~/common/exceptions/biz.excpetion'
import { ErrorCodeEnum } from '~/constants/error-code.constant'
import { CacheService } from '~/processors/cache/cache.service'
import { DatabaseService } from '~/processors/database/database.service'
import { UserDto } from '~/schemas'

import { AuthService } from '../auth/auth.service'
import { UserRegisterDto } from './dtos/register.dto'

@Injectable()
export class UserService {
  private Logger = new Logger(UserService.name)
  constructor(
    private readonly authService: AuthService,
    private readonly redis: CacheService,

    private readonly db: DatabaseService,
  ) {}

  async register(userDto: UserRegisterDto) {
    const isExist = await this.db.prisma.user.exists({
      where: {
        username: userDto.username,
      },
    })

    if (isExist) {
      throw new BizException(ErrorCodeEnum.UserExist)
    }

    const authCode = await this.authService.generateAuthCode()
    const model = await this.db.prisma.user.create({
      data: {
        authCode,
        ...userDto,
        password: hashSync(userDto.password, 10),
      },
    })

    return model
  }

  /**
   * 修改密码
   *
   * @async
   * @param {DocumentType} user - 用户查询结果，已经挂载在 req.user
   * @param {Partial} data - 部分修改数据
   */
  async patchUserData(user: UserDto, data: Partial<UserDto>): Promise<any> {
    const { password } = data
    const doc = { ...data }
    if (password !== undefined) {
      const { id } = user
      const currentUser = await this.db.prisma.user.findUnique({
        where: {
          id,
        },
        select: {
          password: true,
          apiTokens: true,
        },
      })

      if (!currentUser) {
        throw new BizException(ErrorCodeEnum.UserNotFound)
      }
      // 1. 验证新旧密码是否一致
      const isSamePassword = compareSync(password, currentUser.password)
      if (isSamePassword) {
        throw new UnprocessableEntityException('密码可不能和原来的一样哦')
      }

      // 2. 认证码重新生成
      const newCode = nanoid(10)
      doc.authCode = newCode
    }

    await this.db.prisma.user.update({
      where: {
        id: user.id,
      },
      data: doc,
    })
  }

  /**
   * 记录登陆的足迹 (ip, 时间)
   *
   * @async
   * @param {string} ip - string
   * @return {Promise<Record<string, Date|string>>} 返回上次足迹
   */
  async recordFootstep(ip: string): Promise<Record<string, Date | string>> {
    const master = await this.db.prisma.user.findFirst()
    if (!master) {
      throw new BizException(ErrorCodeEnum.UserNotFound)
    }
    const PrevFootstep = {
      lastLoginTime: master.lastLoginTime || new Date(1586090559569),
      lastLoginIp: master.lastLoginIp || null,
    }
    await this.db.prisma.user.update({
      where: {
        id: master.id,
      },
      data: {
        lastLoginTime: new Date(),
        lastLoginIp: ip,
      },
    })

    this.Logger.warn(`主人已登录，IP: ${ip}`)
    return PrevFootstep as any
  }
}
