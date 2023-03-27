import IOST from 'iost';
import { v4 as uuidv4 } from 'uuid';

const CONTRACT_ADDRESS = 'ContractG8uc3Dqe7mVgHRCGH6VJTED1a1vDFCx7EndXWePgxnAB';

export interface Network {
  host: string;
  id: string;
  chainId: number;
  gasRatio: number;
  gasLimit: number;
  delay: number;
  expiration: number;
  defaultLimit: number;
}

const MAINNET: Network = {
  host: 'http://api.iost.io',
  id: 'MAINNET',
  chainId: 1024,
  gasRatio: 1,
  gasLimit: 2000000,
  delay: 0,
  expiration: 90,
  defaultLimit: 1000000,
};

const LOCALNET: Network = {
  host: 'http://127.0.0.1:30001',
  id: 'LOCALNET',
  chainId: 1020,
  gasRatio: 1,
  gasLimit: 2000000,
  delay: 0,
  expiration: 90,
  defaultLimit: 1000000,
};

class IOSUtil {
  private static _instance: IOSUtil;
  private _iwallet: any = null;
  private _iost: IOST.IOST;
  private _network: Network = LOCALNET;
  private _account: IOST.Account = new IOST.Account('');
  private _accountId = '';
  private static _login = false;

  private constructor() {
    this._iost = new IOST.IOST();
  }

  static getInstance(): IOSUtil {
    console.log('getInstance');
    if (!IOSUtil._instance) {
      IOSUtil._instance = new IOSUtil();
      console.log('New IOST');
    }
    return IOSUtil._instance;
  }

  public async init(): Promise<void> {
    console.log('init');
    // iWallet extension の取得
    this._iwallet = window.IWalletJS;
    if (!this._iwallet) {
      throw new Error('Please use Chrome, And install iWallet extension. ');
    }

    // ログインアカウントの取得
    try {
      this._accountId = await this._iwallet.enable();
      console.log('Login account:', this._accountId);
    } catch (e) {
      throw new Error('The iWallet locked. Unlock iWallet. ');
    }
    if (!this._accountId) {
      throw new Error('Please login.');
    }

    // IOSTオブジェクトの作成
    this._iost = this._iwallet.newIOST(IOST);
    if (!this._iost) {
      throw new Error('Please use iWallet plugin.');
    }

    console.log('iwallet:', this._iwallet);

    if (this._iwallet.network === MAINNET.id) {
      this._network = MAINNET;
    }
    const provider = new IOST.HTTPProvider(this._network.host);
    const rpc = new IOST.RPC(provider);
    this._iost.rpc = rpc;
    this._iost.currentRPC = rpc;
    this._iwallet.iost.setRPC(rpc);
    this._iost.config.gasLimit = 1000000;

    this._account = new IOST.Account(this._accountId);
    console.log('this._account:', this._account);

    this._iost.setAccount(this._account);

    console.log(`Logged in by ${this._accountId}`);
    IOSUtil._login = true;
  }

  getAccount(): IOST.Account {
    return this._account;
  }

  async _callABI(
    contract: string,
    method: string,
    args: any[]
  ): Promise<IOST.CallBack> {
    console.log('Start to callABI().');
    const tx = this._iost.callABI(contract, method, args);
    tx.setChainID(this._network.chainId);
    tx.amount_limit = [{ token: '*', value: 'unlimited' }];

    const handler = this._iost.signAndSend(tx);
    return handler;
  }

  /**
   * トークン一覧を取得する。
   * @param owner オーナーアカウント名
   * @returns トークン配列
   */
  async getTokens(owner: string) {
    console.log('owner', owner);
    const tokens = [];
    if (this._iost && this._iost.rpc != null) {
      const res = await this._iost.rpc.blockchain.getContractStorage(
        CONTRACT_ADDRESS,
        `userdata.${owner}`,
        ''
      );
      console.log('res', res);
      if (!res) {
        return [];
      }
      const data = JSON.parse(res.data);
      if (!data) {
        return [];
      }

      const ids = JSON.parse(res.data).nfts;
      console.log('ids', ids);

      for (let i = 0; i < ids.length; i++) {
        const res = await this._iost.rpc.blockchain.getContractStorage(
          CONTRACT_ADDRESS,
          `token_${ids[i]}`,
          ''
        );
        console.log('res', res);
        if (!res) {
          return [];
        }
        const token = JSON.parse(res.data);
        if (!token) {
          return [];
        }
        tokens.push(token);
      }
    }

    return tokens;
  }

  /**
   * NFTを作成する。
   * @param id トークンID
   * @param name 名前
   * @param category カテゴリー
   * @param imageUrl 画像URL
   */
  async createToken(
    id: number,
    name: string,
    category: string,
    imageUrl: string
  ) {
    const meta = JSON.stringify({ info: name });
    const uuid = uuidv4();
    return await this._callABI(CONTRACT_ADDRESS, 'create', [
      id,
      uuid,
      category,
      name,
      imageUrl,
      meta,
      'False',
      '0.0',
      0,
      0,
      's',
    ]);
  }


  /**
   * NFTを発行する。
   * @param id トークンID
   * @param account 発行先アカウント
   */
  async issueToken(
    id: number,
    account: string
  ) {
    return await this._callABI(CONTRACT_ADDRESS, 'issue', [
      id,
      account
    ]);
  }
}

export const iosUtil = IOSUtil.getInstance();
