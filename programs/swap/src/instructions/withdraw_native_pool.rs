use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{ Mint, Token, TokenAccount };

use crate::constants::{ POOL_CONFIG_ACCOUNT_SEED, POOL_TOKEN_ACCOUNT_SEED };
use crate::error::CustomError;
use crate::state::*;
use crate::utils::*;

#[derive(Accounts)]
pub struct WithdrawNative<'info> {
    
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

    #[account(mut,
        seeds = [
            POOL_CONFIG_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
        ],
        bump = pool_config_account.pool_config_account_bump,
        has_one = master_authority,
        has_one = authority,
        has_one = pool_token_account
    )]
    pub pool_config_account: Account<'info, PoolConfigAccount>,
    // CHECK: this mint use to validate account
    pub token_mint_address: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, constraint = master_authority.lamports() @ CustomError::InsufficientFunds)]
    pub master_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn withdraw_native_handler<'info>(
    ctx: Context<'_, '_, '_, 'info, WithdrawToken<'info>>,
    amount: u64
) -> Result<()> {
    //
    require_gte!(ctx.accounts.pool_native_account.lamports, amount, CustomError::InsufficientFunds);
    let authority = ctx.accounts.authority.key();
    let mint = ctx.accounts.token_mint_address.key();
    let pool_config_account_bump = ctx.accounts.pool_config_account.pool_config_account_bump;
    let seeds = &[
        &[
            POOL_CONFIG_ACCOUNT_SEED,
            authority.as_ref(),
            mint.as_ref(),
            bytemuck::bytes_of(&pool_config_account_bump),
        ][..],
    ];

    Ok(())
}

pub fn drain_native<'info>(ctx: Context<'_, '_, '_, 'info, WithdrawToken<'info>>) -> Result<()> {
    let authority = ctx.accounts.authority.key();
    let mint = ctx.accounts.token_mint_address.key();
    let pool_config_account_bump = ctx.accounts.pool_config_account.pool_config_account_bump;
    let seeds = &[
        &[
            POOL_CONFIG_ACCOUNT_SEED,
            authority.as_ref(),
            mint.as_ref(),
            bytemuck::bytes_of(&pool_config_account_bump),
        ][..],
    ];
    let amount = ctx.accounts.pool_native_account.lamports;

    Ok(())
}