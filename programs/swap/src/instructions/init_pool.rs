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
    pub pool_token_account: Account<'info, TokenAccount>,

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
        space = PoolConfigAccount::LEN
    )]
    pub pool_config_account: Account<'info, PoolConfigAccount>,

    pub token_mint_address: Account<'info, Mint>,
    #[account(mut, constraint = authority.data_is_empty() @ CustomError::InvalidAccount)]
    pub authority: Signer<'info>,
    /// CHECK: this account use to setup pool config account
    #[account(constraint = master_authority.data_is_empty() @ CustomError::InvalidAccount)]
    pub master_authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler_init<'info>(
    ctx: Context<'_, '_, '_, 'info, Initialize<'info>>,
    token_price: u64
) -> Result<()> {
    let pool_config_account = &mut ctx.accounts.pool_config_account;
    pool_config_account.token_price = token_price;
    pool_config_account.pool_config_account_bump = *ctx.bumps.get("pool_config_account").unwrap();
    pool_config_account.pool_token_account_bump = *ctx.bumps.get("pool_token_account").unwrap();
    let pool_native_account_bump = *ctx.bumps.get("pool_native_account").unwrap();
    pool_config_account.pool_native_account_bump = pool_native_account_bump;
    pool_config_account.token_mint_address = ctx.accounts.token_mint_address.key();
    pool_config_account.pool_token_account = ctx.accounts.pool_token_account.key();
    pool_config_account.pool_native_account = ctx.accounts.pool_native_account.key();
    pool_config_account.master_authority = ctx.accounts.master_authority.key();
    pool_config_account.authority = ctx.accounts.authority.key();

    ctx.accounts.create_native_account_vault(pool_native_account_bump)?;
    Ok(())
}

impl<'info> Initialize<'info> {
    fn create_native_account_vault(&self, pool_native_account_bump: u8) -> Result<()> {
        let authority_key = self.authority.key();
        let mint_address = self.token_mint_address.key();
        let pool_config_account_key = self.pool_config_account.key();
        let signers_seeds = &[
            &[
                POOL_NATIVE_ACCOUNT_SEED,
                authority_key.as_ref(),
                mint_address.as_ref(),
                pool_config_account_key.as_ref(),
                bytemuck::bytes_of(&pool_native_account_bump),
            ][..],
        ];
        let lamports = self.rent.minimum_balance(0);
        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::system_instruction::create_account(
                self.authority.key,
                self.pool_native_account.key,
                lamports,
                0 as u64,
                &self.system_program.key()
            ),
            &[
                self.authority.to_account_info(),
                self.pool_native_account.to_account_info(),
                self.system_program.to_account_info(),
            ],
            signers_seeds
        )?;
        Ok(())
    }
}