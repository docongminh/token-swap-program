use crate::constants::POOL_CONFIG_ACCOUNT_SEED;

use crate::state::*;
use crate::error::*;

use anchor_lang::prelude::*;
use anchor_spl::token::{ Mint, Token };

#[derive(Accounts)]
#[instruction()]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [
            POOL_CONFIG_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
        ],
        bump = pool_config_account.pool_config_account_bump,
        has_one = authority @ CustomError::InvalidAuthority
    )]
    pub pool_config_account: Account<'info, PoolConfigAccount>,

    pub token_mint_address: Account<'info, Mint>,
    #[account(mut, constraint = authority.data_is_empty() @ CustomError::InvalidAccount)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler_update_config<'info>(
    ctx: Context<'_, '_, '_, 'info, UpdateConfig<'info>>,
    disable: bool
) -> Result<()> {
    let config_account = &mut ctx.accounts.pool_config_account;
    config_account.is_active = disable;
    Ok(())
}