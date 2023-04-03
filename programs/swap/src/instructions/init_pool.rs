use crate::constants::{
    POOL_TOKEN_ACCOUNT_SEED,
    POOL_CONFIG_ACCOUNT_SEED,
    POOL_NATIVE_ACCOUNT_SEED,
};
use crate::state::*;
use crate::error::*;

use anchor_lang::prelude::*;
use anchor_spl::token::{ Mint, Token, TokenAccount };

#[derive(Accounts)]
#[instruction()]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        seeds = [
            POOL_TOKEN_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
            pool_config_account.key().as_ref(),
        ],
        bump,
        token::mint = token_mint_address,
        token::authority = pool_config_account
    )]
    pub pool_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: This account will be create when create swap pool
    #[account(mut,
        seeds=[
            POOL_NATIVE_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
            pool_config_account.key().as_ref()
        ],
        bump
    )]
    pub pool_native_account: AccountInfo<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [
            POOL_CONFIG_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
        ],
        bump,
        space = SwapPoolConfigAccount::LEN
    )]
    pub pool_config_account: Box<Account<'info, SwapPoolConfigAccount>>,

    pub token_mint_address: Account<'info, Mint>,
    #[account(mut, constraint = authority.data_is_empty() @ CustomError::InvalidAccount)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler_init<'info>(ctx: Context<'_, '_, '_, 'info, Initialize<'info>>) -> Result<()> {
    Ok(())
}