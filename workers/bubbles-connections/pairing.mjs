import {digest,randomToken} from './vault.mjs';

// This session authorizes connector routes only. It never contains a wallet
// token and cannot authenticate to the wallet or Robot Brain services.
export class ConnectorPairing {
  constructor(storage,now=Date.now){this.storage=storage;this.now=now;}
  async create({userId}){
    const code=randomToken(),key='pair:'+await digest(code),owner='owner:'+await digest(userId);
    await this.storage.transaction(async tx=>{
      const previous=await tx.get(owner);
      if(previous?.createdAt>this.now()-10000)throw Error('too_many_requests');
      if(previous?.key)await tx.delete(previous.key);
      await tx.put(key,{userId,expiresAt:this.now()+120000});
      await tx.put(owner,{key,createdAt:this.now()});
    });
    await this.storage.setAlarm(this.now()+120000);
    return {code,expiresIn:120};
  }
  async redeem({code}){
    if(typeof code!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(code))throw Error('pairing_invalid_or_expired');
    const key='pair:'+await digest(code),token='bc_'+randomToken(),sessionKey='session:'+await digest(token);
    const expiresAt=this.now()+900000;
    await this.storage.transaction(async tx=>{
      const pair=await tx.get(key);
      if(!pair||pair.expiresAt<=this.now())throw Error('pairing_invalid_or_expired');
      await tx.delete(key);
      await tx.put(sessionKey,{userId:pair.userId,expiresAt});
    });
    await this.storage.setAlarm(this.now()+120000);
    return {token,expiresAt};
  }
  async identity({token}){
    if(!/^bc_[A-Za-z0-9_-]{43}$/.test(token||''))throw Error('verified_wallet_required');
    const key='session:'+await digest(token),session=await this.storage.get(key);
    if(!session||session.expiresAt<=this.now())throw Error('verified_wallet_required');
    return {userId:session.userId,sessionId:await digest(token)};
  }
  async end({token}){await this.storage.delete('session:'+await digest(token));return {ok:true};}
  async cleanup(){
    const entries=await this.storage.list({limit:1000});
    for(const [key,value] of entries)if(/^(pair:|session:|owner:)/.test(key)&&(value.expiresAt||value.createdAt+120000)<=this.now())await this.storage.delete(key);
    if(entries.size)await this.storage.setAlarm(this.now()+120000);
  }
}
