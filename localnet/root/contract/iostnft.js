const tokenPrefix = 'token_';
const userTokenPrefix = 'user_';
const MIGRATE_KEY = 'migrate_info';
const INFO_KEY = 'nft_info';
const LOG_EXPIRE_SECOND = 3600000;
const USERDATA = 'userdata.';

class NFT {
  init() {}

  /**
   * NFTメタデータを更新する。
   */
  _nftUpdate() {
    var minlogNum = this._get('minlogNum');
    var maxlogNum = this._get('maxlogNum');
    var tokenTotal = this._get('tokenTotal');

    var nft = {
      TOKEN_COUNT: 0,
      MIN_LOG_ID: 0,
      MAX_LOG_ID: 0,
      API_URL: '#', //Abandoned
      CONTRACT_NAME: 'XPET', //Porject Name
      CONTRACT_LOGO:
        'https://images-1251625178.cos.ap-guangzhou.myqcloud.com/xpet128.png', //Project Logo
    };

    if (minlogNum) {
      nft.MIN_LOG_ID = minlogNum;
    }
    if (maxlogNum) {
      nft.MAX_LOG_ID = maxlogNum;
    }
    if (tokenTotal) {
      nft.TOKEN_COUNT = tokenTotal;
    }

    this._put(INFO_KEY, nft);
  }

  /**
   * コントラクト所有者がどうかを返す。
   * @returns コントラクト所有者なら true、でなければ false
   */
  onlyAllowContract() {
    return blockchain.requireAuth(blockchain.contractOwner(), 'active');
  }

  /**
   * コントラクト所有者かどうかチェックして、エラーなら例外を投げて中断する。
   */
  _requireAuth() {
    const ret = blockchain.requireAuth(blockchain.contractOwner(), 'active');
    if (ret != true) {
      throw 'require auth error';
    }
  }

  /**
   * アカウントの署名があるかどうかチェックして、エラーなら例外を投げて中断する。
   * @param {string} owner アカウント
   */
  _requireOwner(owner) {
    const ret = blockchain.requireAuth(owner, 'active');
    if (ret != true) {
      throw new Error('require auth failed. ret = ' + ret + 'owner = ' + owner);
    }
  }

  /**
   * コントラクト所有者のみが更新可能にする。
   * 
   * @param {string} data 
   * @returns 更新可能なら true、そうでなければ false
   */
  can_update(data) {
    this._requireAuth();
    return true;
  }

  /**
   * ストレージデータをす属する。
   * 
   * @param {string} k キー
   * @returns ストレージの値
   */
  _get(k) {
    const val = storage.get(k);
    if (val === '') {
      return 0;
    } else {
      return JSON.parse(val);
    }
  }

  /**
   * ストレージに保存する。
   * 
   * @param {string} k キー
   * @param {string} v 値
   * @param {string} p 負担アカウント
   */
  _put(k, v, p) {
    storage.put(k, JSON.stringify(v), p);
  }

  /**
   * ストレージから削除する。
   * 
   * @param {string} k キー
   */
  _remove(k) {
    storage.del(k);
  }

  /**
   * メッセージをフォーマットする。
   * 
   * @param {number} code コード
   * @param {string} msg メッセージ
   * @param {string} obj オブジェクト
   * @returns 
   */
  _msg(code, msg, obj) {
    var success;
    if (code == 200) {
      success = true;
    } else {
      success = false;
    }
    var message = {
      code: code,
      message: msg,
      success: success,
      object: obj,
    };
    return message;
  }

  /**
   * ログを削除する。
   */
  _clearLog() {
    var minlogNum = this._get('minlogNum');
    var maxlogNum = this._get('maxlogNum');
    var logInfo = this._get('log' + minlogNum);
    if (maxlogNum) {
      var nowTime = tx.time / 1000000;
      var timeInterval = nowTime - logInfo.acttime;
      if (maxlogNum - minlogNum > 1000) {
        this._remove('log' + minlogNum);
      }
    }
    this._put('minlogNum', minlogNum + 1);
    this._nftUpdate();
  }

  /**
   * アカウントがブラックリストにあれば、例外を投げて終了する。
   * 
   * @param {string} user アカウント
   */
  _blackCheck(user) {
    var blacklist = this._get('blacklist');
    if (blacklist) {
      var existed = false;
      for (var i = 0; i < blacklist.length; i++) {
        if (blacklist[i] == user) {
          existed = true;
        }
      }
      if (existed == true) {
        throw 'Your account is on the blacklist and cannot be transferred';
      }
    }
  }

  /**
   * トークンIDがなければ、例外を投げて終了する。
   * 
   * @param {number} id トークンID
   */
  _migrateCheck(id) {
    var migratelist = this._get(MIGRATE_KEY);
    if (migratelist) {
      var existed = false;
      for (var i = 0; i < migratelist.length; i++) {
        if (migratelist[i].id == id) {
          existed = true;
        }
      }
      if (existed == true) {
        throw 'The asset is in the process of applying for transfer';
      }
    }
  }

  /**
   * ユーザデータを取得する。
   * 
   * @param {string} owner アカウント 
   * @returns ユーザデータ
   */
  _getuserdata(owner) {
    return this._get(USERDATA + owner);
  }

  /**
   * ユーザデータを設定する。
   * 
   * @param {string} owner アカウント
   * @param {string} userdata ユーザデータ
   */
  _setuserdata(owner, userdata) {
    this._put(USERDATA + owner, userdata);
  }

  /**
   * ユーザにトークンを追加する。
   * 
   * @param {string} owner アカウント
   * @param {number} tokenid トークンID
   */
  addusernft(owner, tokenid) {
    var userdata = this._getuserdata(owner);
    if (userdata) {
    } else {
      userdata = {
        owner: owner,
        nfts: [],
      };
    }
    const index = userdata.nfts.indexOf(tokenid);
    if (index == -1) {
      userdata.nfts.push(tokenid);
      this._setuserdata(owner, userdata);
    }
  }

  /**
   * ユーザのNFTを削除する。
   * 
   * @param {string} owner ユーザ
   * @param {number} tokenid トークンID
   */
  removeusernft(owner, tokenid) {
    var userdata = this._getuserdata(owner);
    if (userdata) {
      const index = userdata.nfts.indexOf(tokenid);
      if (index > -1) {
        userdata.nfts.splice(index, 1);
      }
      this._setuserdata(owner, userdata);
    }
  }

  /**
   * ログを追加する。
   * 
   * @param {string} log ログ
   */
  addLog(log) {
    var maxlogNum = this._get('maxlogNum');
    var minlogNum = this._get('minlogNum');

    this._put('log' + (maxlogNum + 1), log);
    this._put('maxlogNum', maxlogNum + 1);

    if (minlogNum) {
      this._clearLog();
    } else {
      this._put('minlogNum', 0);
    }
  }

  /**
   * 1000件までになるようにログを削除する。
   */
  rmLog() {
    var maxlogNum = this._get('maxlogNum');
    var minlogNum = this._get('minlogNum');

    if (minlogNum && maxlogNum) {
      if (maxlogNum - minlogNum > 1000) {
        this._remove('log' + minlogNum);
        this._put('minlogNum', minlogNum + 1);
        this._nftUpdate();
      }
    }
  }

  /**
   * トークンを発行する。
   * 
   * @param {number} id トークンID 
   * @param {string} newowner 発行先アカウント
   * @returns 
   */
  issue(id, newowner) {
    this._requireAuth();
    var contractOwner = blockchain.contractOwner();
    var tokeninfo = this._get(tokenPrefix + id);
    if (tokeninfo) {
      if (tokeninfo.owner == contractOwner) {
        var userTokenNum = this._get(userTokenPrefix + newowner);
        if (tokeninfo.owner == newowner) {
          throw 'New account is the same as old account';
        }

        this.removeusernft(contractOwner, id);
        this.addusernft(newowner, id);

        tokeninfo.owner = newowner;
        var nowTime = tx.time / 1000000;
        var log = {
          from: contractOwner,
          to: newowner,
          memo: 'ASSIGN-' + id,
          acttime: nowTime,
          tokenId: id,
        };

        this._put(tokenPrefix + id, tokeninfo);
        this._put(userTokenPrefix + newowner, userTokenNum + 1);

        this.addLog(log);
        this._nftUpdate();
        return this._msg(200, 'success');
      } else {
        return this._msg(0, 'token setup failed');
      }
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * トークンを再割当てする。
   * 
   * @param {number} id トークンID
   * @param {string} newowner 新所有者
   * @returns 実行結果
   */
  reassign(id, newowner) {
    this._requireAuth();
    var contractOwner = blockchain.contractOwner();
    var tokeninfo = this._get(tokenPrefix + id);
    if (tokeninfo) {
      var from = tokeninfo.owner;
      var userTokenNum = this._get(userTokenPrefix + newowner);
      var oldOwnerTokenNum = this._get(userTokenPrefix + from);

      this.removeusernft(from, id);
      this.addusernft(newowner, id);

      if (tokeninfo.owner == newowner) {
        throw 'New account is the same as old account';
      }
      tokeninfo.owner = newowner;
      var nowTime = tx.time / 1000000;
      var log = {
        from: contractOwner,
        to: newowner,
        memo: 'ASSIGN-' + id,
        acttime: nowTime,
        tokenId: id,
      };

      this._put(tokenPrefix + id, tokeninfo);
      this._put(userTokenPrefix + newowner, userTokenNum + 1);
      this._put(userTokenPrefix + from, oldOwnerTokenNum - 1);

      this.addLog(log);
      this._nftUpdate();
      return this._msg(200, 'success');
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * NFTを作成する。
   * 
   * @param {number} id トークンID
   * @param {string} uuid UUID
   * @param {string} category カテゴリ
   * @param {string} name 名前
   * @param {string} imageUrl 画像URL
   * @param {string} meta メタデータ
   * @param {string} lock ロック中か？
   * @param {string} ext 追加情報
   * @param {number} level レベル
   * @param {number} quality クオリティ
   * @param {string} parvalue パラメータ
   * @returns 
   */
  create(
    id,
    uuid,
    category,
    name,
    imageUrl,
    meta,
    lock,
    ext,
    level,
    quality,
    parvalue
  ) {
    this._requireAuth();

    if (this._get(tokenPrefix + id)) {
      throw 'token existed';
    }

    var owner = blockchain.contractOwner();
    var tokenMsg = {
      id: id,
      uuid: uuid,
      category: category,
      name: name,
      imageUrl: imageUrl,
      meta: meta,
      lock: lock,
      ext: ext,
      owner: owner,
      level: level,
      quality: quality,
      parvalue: parvalue,
    };
    var tokenTotal = this._get('tokenTotal');
    var nowTime = tx.time / 1000000;
    var log = {
      from: owner,
      to: owner,
      memo: 'CREATE-' + id,
      acttime: nowTime,
      tokenId: id,
    };

    this.addusernft(owner, id);

    this._put(tokenPrefix + id, tokenMsg);
    this._put('tokenTotal', tokenTotal + 1);
    this.addLog(log);
    this._nftUpdate();
    return this._msg(200, 'success');
  }

  /**
   * メタデータを更新する。
   * 
   * @param {number} id トークンID
   * @param {string} category カテゴリ 
   * @param {string} name 名前
   * @param {string} imageUrl 画像URL
   * @param {string} meta メタデータ
   * @returns 実行結果
   */
  updatemeta(id, category, name, imageUrl, meta) {
    this._requireAuth();
    var tokeninfo = this._get(tokenPrefix + id);
    if (tokeninfo) {
      var tokenMsg = {
        id: id,
        uuid: tokeninfo.uuid,
        category: category,
        name: name,
        imageUrl: imageUrl,
        meta: meta,
        lock: tokeninfo.lock,
        ext: tokeninfo.ext,
        owner: tokeninfo.owner,
      };
      var nowTime = tx.time / 1000000;
      var log = {
        from: tokeninfo.owner,
        to: tokeninfo.owner,
        memo: 'UPDATE-' + id,
        acttime: nowTime,
        tokenId: id,
      };

      this._put(tokenPrefix + id, tokenMsg);
      this.addLog(log);
      this._nftUpdate();
      return this._msg(200, 'success');
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * 追加情報を更新する。
   * 
   * @param {number} id トークンID
   * @param {string} ext 
   * @returns 実行結果
   */
  updateext(id, ext) {
    this._requireAuth();
    var tokeninfo = this._get(tokenPrefix + id);
    if (tokeninfo) {
      var tokenMsg = {
        id: id,
        uuid: tokeninfo.uuid,
        category: tokeninfo.category,
        name: tokeninfo.name,
        imageUrl: tokeninfo.imageUrl,
        meta: tokeninfo.meta,
        lock: tokeninfo.lock,
        ext: ext,
        owner: tokeninfo.owner,
      };
      var nowTime = tx.time / 1000000;
      var log = {
        from: tokeninfo.owner,
        to: tokeninfo.owner,
        memo: 'UPDATE-' + id,
        acttime: nowTime,
        tokenId: id,
      };

      this._put(tokenPrefix + id, tokenMsg);
      this.addLog(log);
      this._nftUpdate();
      return this._msg(200, 'success');
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * ロック状態を変更する。
   * 
   * @param {number} id トークンID
   * @param {string} lock ロッグ
   * @returns 実行結果
   */
  updatelock(id, lock) {
    this._requireAuth();

    var tokeninfo = this._get(tokenPrefix + id);
    if (tokeninfo) {
      tokeninfo.lock = lock;

      var nowTime = tx.time / 1000000;
      var log = {
        from: tokeninfo.owner,
        to: tokeninfo.owner,
        memo: 'UPDATE-' + id,
        acttime: nowTime,
        tokenId: id,
      };

      this._put(tokenPrefix + id, tokeninfo);
      this.addLog(log);
      this._nftUpdate();
      return this._msg(200, 'success');
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * トークンを転送する。
   * 
   * @param {number} id トークンID
   * @param {string} from 転送元アカウント
   * @param {string} to 転送先アカウント
   * @param {number} amount 数量（必ず1)
   * @param {string} memo メモ
   * @returns 実行結果
   */
  transfer(id, from, to, amount, memo) {
    this._requireOwner(from);
    var tokeninfo = this._get(tokenPrefix + id);

    if (from == to) {
      throw 'token is belong to you';
    }

    if (tokeninfo) {
      if (tokeninfo.owner == from) {
        var tokenMsg = {
          from: from,
          to: to,
          memo: memo,
        };

        if (tokeninfo.lock == true) {
          throw 'token is locked';
        }

        this._blackCheck(from);
        this._migrateCheck(id);

        var oldOwnerTokenNum = this._get(userTokenPrefix + from);
        var newOwnerTokenNum = this._get(userTokenPrefix + to);
        tokeninfo.owner = to;
        var nowTime = tx.time / 1000000;
        var log = {
          from: from,
          to: to,
          memo: 'TRANSFER-' + id + '-' + memo,
          acttime: nowTime,
          tokenId: id,
        };

        this._put(userTokenPrefix + from, oldOwnerTokenNum - 1);
        this._put(userTokenPrefix + to, newOwnerTokenNum + 1);
        this._put(tokenPrefix + id, tokeninfo);

        this.addusernft(to, id);
        this.removeusernft(from, id);

        this.addLog(log);
        this._nftUpdate();
        return this._msg(200, 'success');
      } else {
        throw 'token does not belong to you';
      }
    } else {
      throw "token doesn't exisit";
    }
  }

  /**
   * トークンを削除する。
   * 
   * @param {number} id トークンID
   * @returns 実行結果
   */
  rmtoken(id) {
    var formUser = blockchain.publisher();
    this._requireOwner(formUser);
    var tokeninfo = this._get(tokenPrefix + id);
    if (tokeninfo) {
      var userTokenNum = this._get(userTokenPrefix + tokeninfo.owner);
      var tokenTotal = this._get('tokenTotal');
      var nowTime = tx.time / 1000000;
      var log = {
        from: formUser,
        to: formUser,
        memo: 'REMOVE-' + id,
        acttime: nowTime,
        tokenId: id,
      };

      this.removeusernft(tokeninfo.owner, id);

      this._put(userTokenPrefix + tokeninfo.owner, userTokenNum - 1);
      this._put('tokenTotal', tokenTotal - 1);

      this._remove(tokenPrefix + id);
      this.addLog(log);
      this._nftUpdate();
      return this._msg(200, 'success');
    } else {
      throw "token doesn't exisit";
    }
  }

  /**
   * トークンの所有者を取得する。
   * 
   * @param {number} tokenId トークンID
   * @returns 実行結果
   */
  ownerOf(tokenId) {
    var tokeninfo = this._get(tokenPrefix + tokenId);
    if (tokeninfo) {
      return this._msg(200, 'success', tokeninfo.owner);
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * トークンのメタデータを取得する。
   * 
   * @param {number} tokenId トークンID
   * @returns 実行結果
   */
  tokenMetadata(tokenId) {
    var tokeninfo = this._get(tokenPrefix + tokenId);
    if (tokeninfo) {
      return this._msg(200, 'success', tokeninfo.meta);
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * トークン情報を取得する。
   * 
   * @param {number} tokenId トークンID
   * @returns 実行結果
   */
  tokenInfo(tokenId) {
    var tokeninfo = this._get(tokenPrefix + tokenId);
    if (tokeninfo) {
      return this._msg(200, 'success', tokeninfo);
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * NFTの情報を取得する。
   * 
   * @returns 実行結果
   */
  nftInfo() {
    var nftInfo = this._get(INFO_KEY);
    if (nftInfo) {
      return this._msg(200, 'success', nftInfo);
    } else {
      return this._msg(0, 'No information');
    }
  }

  /**
   * ブラックリストにアカウントを登録する。
   * 
   * @param {string} acc アカウント
   * @returns 実行結果
   */
  addblack(acc) {
    this._requireAuth();

    var blacklist = this._get('blacklist');
    if (blacklist) {
      var existed = false;
      for (var i = 0; i < blacklist.length; i++) {
        if (blacklist[i] == acc) {
          existed = true;
        }
      }
      if (existed == false) {
        blacklist[blacklist.length] = acc;
        this._put('blacklist', blacklist);
        return this._msg(200, 'success');
      } else {
        return this._msg(0, 'Account is already blacklisted');
      }
    } else {
      blacklist = [];
      blacklist[0] = acc;
      this._put('blacklist', blacklist);
      return this._msg(200, 'success');
    }
  }

  /**
   * ブラックリストからアカウントを削除する。
   * @param {string} acc アカウント
   * @returns 実行結果
   */
  rmblack(acc) {
    this._requireAuth();

    var blacklist = this._get('blacklist');
    if (blacklist) {
      var existed = false;
      for (var i = 0; i < blacklist.length; i++) {
        if (blacklist[i] == acc) {
          existed = true;
          blacklist.splice(i, 1);
        }
      }
      if (existed == true) {
        this._put('blacklist', blacklist);
        return this._msg(200, 'success');
      } else {
        return this._msg(0, 'Account is not on the blacklist');
      }
    } else {
      return this._msg(0, 'param does not exist');
    }
  }

  /**
   * マイグレーションする。
   * 
   * @param {number} id トークンID
   * @param {string} target 対象
   * @param {string} account アカウント
   * @returns 実行結果
   */
  applymigrate(id, target, account) {
    var formUser = blockchain.publisher();
    this._requireOwner(formUser);
    var tokeninfo = this._get(tokenPrefix + id);
    if (tokeninfo) {
      if (tokeninfo.owner == formUser) {
        if (tokeninfo.lock == true) {
          throw 'token is locked';
        }

        this._blackCheck(formUser);

        var userMigrate = {
          id: id,
          account: account,
          target: target,
        };
        var migratelist = this._get(MIGRATE_KEY);
        if (migratelist) {
          if (migratelist.length >= 32) {
            throw 'migrate queue is full';
          }
          var existed = false;

          for (var i = 0; i < migratelist.length; i++) {
            if (migratelist[i].id == id) {
              existed = true;
            }
          }

          if (existed == false) {
            migratelist[migratelist.length] = userMigrate;
            this._put(MIGRATE_KEY, migratelist);
            return this._msg(200, 'success');
          } else {
            return this._msg(
              0,
              'You have submitted it, please wait for review'
            );
          }
        } else {
          migratelist = [];
          migratelist[0] = userMigrate;
          this._put(MIGRATE_KEY, migratelist);
          return this._msg(200, 'success');
        }
      } else {
        return this._msg(0, 'token does not belong to you');
      }
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * マイグレーションを承認する。
   * 
   * @param {number} id トークンID
   * @param {string} approve 承認
   * @returns 実行結果
   */
  apprmigrate(id, approve) {
    this._requireAuth();
    var migratelist = this._get(MIGRATE_KEY);

    if (migratelist) {
      var existed = false;

      for (var i = 0; i < migratelist.length; i++) {
        if (migratelist[i].id == id) {
          existed = true;
          migratelist.splice(i, 1);
        }
      }

      if (existed == true) {
        this._put(MIGRATE_KEY, migratelist);

        if (approve == 'True') {
          return this.burn(id);
        } else {
          return this._msg(200, 'success reject=' + approve);
        }
      } else {
        return this._msg(0, 'No such apply');
      }
    } else {
      return this._msg(0, 'migratelist empty');
    }
  }

  /**
   * トークンを焼却する。
   * 
   * @param {number} id トークンID
   * @returns 実行結果
   */
  burn(id) {
    this._requireAuth();
    var tokeninfo = this._get(tokenPrefix + id);
    if (tokeninfo) {
      var owner = tokeninfo.owner;
      var tokenTotal = this._get('tokenTotal');
      var userTokenTotal = this._get(userTokenPrefix + owner);
      var nowTime = tx.time / 1000000;
      var log = {
        from: blockchain.contractOwner(),
        to: blockchain.contractOwner(),
        memo: 'BURN-' + id,
        acttime: nowTime,
        tokenId: id,
      };

      this.removeusernft(owner, id);

      this._remove(tokenPrefix + id);
      this._put(userTokenPrefix + owner, userTokenTotal - 1);
      this._put('tokenTotal', tokenTotal - 1);
      this.addLog(log);
      this._nftUpdate();

      return this._msg(200, 'success burn');
    } else {
      return this._msg(0, 'token does not exist');
    }
  }

  /**
   * 指定範囲のトークンを設定する。
   * 
   * @param {number} beginid 開始トークンID
   * @param {number} endid 終了トークンID
   * @returns 実行結果
   */
  formatudata(beginid, endid) {
    this._requireAuth();
    for (var i = beginid; i <= endid; ++i) {
      var tokeninfo = this._get(tokenPrefix + i);
      if (tokeninfo) {
        this.addusernft(tokeninfo.owner, i);
      }
    }
    return this._msg(200, 'success');
  }
}

module.exports = NFT;
