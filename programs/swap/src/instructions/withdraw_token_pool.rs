use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{ Mint, Token, TokenAccount };

use crate::constants::{ POOL_CONFIG_ACCOUNT_SEED, POOL_TOKEN_ACCOUNT_SEED };
use crate::error::CustomError;
use crate::state::*;
use crate::utils::*;

#[derive(Accounts)]
pub struct WithdrawToken<'info> {
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
    pub pool_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [
            POOL_CONFIG_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
        ],
        bump = pool_config_account.pool_config_account_bump,
        has_one = master_authority @ CustomError::WithdrawPermission,
        has_one = authority @ CustomError::InvalidAuthority,
        has_one = pool_token_account
    )]
    pub pool_config_account: Box<Account<'info, PoolConfigAccount>>,
    pub token_mint_address: Account<'info, Mint>,
    #[account(
        init_if_needed,
        associated_token::mint = token_mint_address,
        associated_token::authority = master_authority,
        payer = master_authority
    )]
    pub master_authority_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub master_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler_withdraw_token<'info>(
    ctx: Context<'_, '_, '_, 'info, WithdrawToken<'info>>,
    amount: u64
) -> Result<()> {
    //
    require_gte!(ctx.accounts.pool_token_account.amount, amount, CustomError::InsufficientFunds);
    ctx.accounts.withdraw_token(amount)?;

    Ok(())
}

pub fn handler_drain_token<'info>(
    ctx: Context<'_, '_, '_, 'info, WithdrawToken<'info>>
) -> Result<()> {
    let amount = ctx.accounts.pool_token_account.amount;
    ctx.accounts.withdraw_token(amount)?;
    Ok(())
}

impl<'info> WithdrawToken<'info> {
    fn withdraw_token(&self, amount: u64) -> Result<()> {
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
            self.master_authority_token_account.to_account_info(),
            self.pool_config_account.to_account_info(),
            amount,
            self.token_program.to_account_info(),
            Some(seeds)
        )?;

        Ok(())
    }
}