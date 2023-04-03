use crate::constants::{
    POOL_TOKEN_ACCOUNT_SEED,
    POOL_CONFIG_ACCOUNT_SEED,
    POOL_NATIVE_ACCOUNT_SEED,
};
use crate::state::*;
use crate::error::*;
use crate::utils::*;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{ Mint, Token, TokenAccount };

#[derive(Accounts)]
#[instruction(lamport_amount: u64)]
pub struct SwapToken<'info> {
    #[account(
        mut,
        seeds = [
            POOL_TOKEN_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
            pool_config_account.key().as_ref(),
        ],
        bump = pool_config_account.pool_token_account_bump,
        token::mint = token_mint_address,
        token::authority = pool_config_account
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    /// CHECK: This account will be create when create swap pool
    #[account(mut,
        seeds=[
            POOL_NATIVE_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
            pool_config_account.key().as_ref()
        ],
        bump = pool_config_account.pool_native_account_bump
    )]
    pub pool_native_account: AccountInfo<'info>,

    #[account(mut,
        seeds = [
            POOL_CONFIG_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
        ],
        bump = pool_config_account.pool_config_account_bump
    )]
    pub pool_config_account: Account<'info, PoolConfigAccount>,
    #[account(
        init_if_needed,
        associated_token::mint = token_mint_address,
        associated_token::authority = user,
        payer = user
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    pub token_mint_address: Account<'info, Mint>,
    #[account(mut, constraint = authority.data_is_empty() @ CustomError::InvalidAccount)]
    pub authority: Signer<'info>,
    #[account(mut, constraint = user.lamports() > lamport_amount @ CustomError::InsufficientFunds)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler_swap_token<'info>(
    ctx: Context<'_, '_, '_, 'info, SwapToken<'info>>,
    lamport_amount: u64
) -> Result<()> {
    let token_price = ctx.accounts.pool_config_account.token_price;
    let token_amount = (token_price * lamport_amount) / LAMPORTS_PER_SOL;
    ctx.accounts.transfer_sol(lamport_amount)?;
    ctx.accounts.transfer_token(token_amount)?;
    Ok(())
}

impl<'info> SwapToken<'info> {
    fn transfer_sol(&self, lamports_amount: u64) -> Result<()> {
        transfer_native_to_account(
            self.user.to_account_info(),
            self.pool_native_account.to_account_info(),
            lamports_amount,
            self.system_program.to_account_info(),
            None
        )?;
        Ok(())
    }

    fn transfer_token(&self, token_amount: u64) -> Result<()> {
        let authority = self.authority.key();
        let mint = self.token_mint_address.key();
        let pool_config_account_bump = self.pool_config_account.pool_config_account_bump;
        let seeds = &[
            &[
                POOL_CONFIG_ACCOUNT_SEED,
                authority.as_ref(),
                mint.as_ref(),
                bytemuck::bytes_of(&pool_config_account_bump),
            ][..],
        ];
        transfer_token_to_account(
            self.pool_token_account.to_account_info(),
            self.user_token_account.to_account_info(),
            self.pool_config_account.to_account_info(),
            token_amount,
            self.token_program.to_account_info(),
            Some(seeds)
        )?;

        Ok(())
    }
}