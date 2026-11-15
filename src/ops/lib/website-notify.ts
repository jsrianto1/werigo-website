// Website ride status is updated by the same PostgreSQL transaction.
export async function notifyWebsite(_reason:string){return {ok:true,active:true};}
