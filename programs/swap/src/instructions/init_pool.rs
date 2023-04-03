use crate::constants::*;
use crate::state::*;
use crate::error::*;

use anchor_lang::prelude::*;
use anchor_spl::token::{ Mint, Token, TokenAccount };

#[derive(Accounts)]
#[instruction()]
pub struct Initialize<'info> {
    #[account(mut, constraint = authority.lamports() > 0 && authority.data_is_empty())]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler_init<'info>(ctx: Context<'_, '_, '_, 'info, Initialize<'info>>) -> Result<()> {
    Ok(())
}