import NextAuth from "next-auth";
import {PrismaAdapter} from "@auth/prisma-adapter";
import authConfig from "./auth.config";
import {db} from "./lib/db";
import { getAccountById, getUserById } from "./features/auth/action";

export const {auth, handlers, signIn,signOut} = NextAuth({
    callbacks:{
async signIn({user,account,profile}){
    if(!user|| !account){
        return false;
    }

    if (!user.email) {
        return false;
    }

    const  existinguser = await db.user.findUnique({
        where:{email:user.email}
    });

    if(!existinguser){
        const newUser = await db.user.create({
            data:{
                email:user.email,
                name:user.name,
                image:user.image,

                accounts: {
                    
                    create:{
                        type: account.type,
                        provider:account.provider,
                        providerAccountId: account.providerAccountId,
                        refreshToken: account.refresh_token,
                        accessToken: account.access_token,
                        expiresAt: account.expires_at,
                        tokenType: account.token_type,
                        scope: account.scope,
                        idToken:account.id_token,
                        sessionState: account.session_state ? String(account.session_state) : undefined, 
                    },
                },
            },
        });
        if(!newUser) return false;
    }

    else{
        const existingAccount = await db.account.findUnique({
            where:{
                provider_providerAccountId:{
                    provider:account.provider,
                    providerAccountId: account.providerAccountId,
                }
            }
        })

        if(!existingAccount){
            await db.account.create({
                data:{
                    userId: existinguser.id,  
                    type: account.type,
                    provider:account.provider,
                    providerAccountId: account.providerAccountId,
                    refreshToken: account.refresh_token,
                    accessToken: account.access_token,
                    expiresAt: account.expires_at,
                    tokenType: account.token_type,
                    scope: account.scope,
                    idToken:account.id_token,
                    sessionState: account.session_state ? String(account.session_state) : undefined,   
                }
            });
        }
    }
    return true;
},   

    async jwt ({token,user, account}){
        if(!token.sub) return token;

        const existinguser = await getUserById(token.sub);

        if(!existinguser) return token;

        const existingAccount = await getAccountById(existinguser.id);

        token.name = existinguser.name;
        token.email = existinguser.email;
        token.role = existinguser.role;

        return token;
    },
    async session({session,token}){
            if(token.sub && session.user){
                session.user.id = token.sub;
            }

            if(token.sub && session.user){
                session.user.role = token.role;
            }
            return session;
    }

    },
    secret:process.env.AUTH_SECRET,
    adapter:PrismaAdapter(db),
    session:{strategy:"jwt"},
    ...authConfig
});