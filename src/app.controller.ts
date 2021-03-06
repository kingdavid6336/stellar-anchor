import { Body, Controller, Get, Header, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { WalletFactoryService } from './wallets/wallet-factory.service';
import { TransactionType } from './transactions/enums/transaction-type.enum';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private readonly config: ConfigService,
    private readonly appService: AppService,
    private readonly walletFactory: WalletFactoryService,
  ) {
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('.well-known/stellar.toml')
  @Header('Content-Type', 'text/plain')
  getStellarToml(@Req() req, @Res() res: Response) {
    return res.render(
      'stellar-toml',
      {
        layout: false,
        companyInfo: this.config.get('app').companyInfo,
        host: req.headers.host,
        networkPassphrase: this.config.get('stellar').networkPassphrase,
        signingKey: this.config.get('stellar').signingKey,
        tokens: this.config.get('assets').raw.map((item) => {
          return {
            ...item.stellar,
            symbol: item.code
          };
        })
      },
    );
  }

  @Get('/info')
  info(@Req() req) {
    const response = {
      deposit: {},
      withdraw: {},
      fee: {
        enabled: false,
      },
      transactions: {
        enabled: true,
        authentication_required: false,
      },
      transaction: {
        enabled: true,
        authentication_required: false,
      },
    };

    const assets = this.config.get('assets').raw;
    for (const asset of assets) {
      response.deposit[asset.code] = {
        enabled: asset.stellar.status === 'live',
        ...(asset.deposit ? {
          authentication_required: asset.deposit.authentication_required,
          fee_fixed: asset.deposit.fee_fixed,
          fee_percent: asset.deposit.fee_percent,
          min_amount: asset.deposit.min,
          max_amount: asset.deposit.max,
          fields: asset.deposit.fields,
        } : {}),
      };
      response.withdraw[asset.code] = {
        enabled: asset.stellar.status === 'live',
        ...(asset.withdrawal ? {
          authentication_required: asset.withdrawal.authentication_required,
          fee_fixed: asset.withdrawal.fee_fixed,
          fee_percent: asset.withdrawal.fee_percent,
          min_amount: asset.withdrawal.min,
          max_amount: asset.withdrawal.max,
          types: asset.withdrawal.types,
        } : {}),
      };
    }

    return response;
  }

  @Post('/validateAddress')
  validateDestination(@Body() dto: { asset_code: string, dest: string, dest_extra?: string }) {
    const { walletOut } = this.walletFactory.get(TransactionType.withdrawal, dto.asset_code);
    return walletOut.isValidDestination(dto.asset_code, dto.dest, dto.dest_extra);
  }
}
