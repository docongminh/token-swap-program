pub mod state;
pub mod constants;
pub mod error;
pub mod instructions;
pub mod utils;

use crate::instructions::*;
use anchor_lang::prelude::*;

declare_id!("EeZfadhHRPxs7QRrzzUA4t99auuxhXvScy8hELJpep8b");

#[program]
pub mod swap {
    use super::*;

    pub fn init_instruction<'info>(
        ctx: Context<'_, '_, '_, 'info, Initialize<'info>>,
        token_price: u64
    ) -> Result<()> {
        handler_init(ctx, token_price)?;
        Ok(())
    }

    pub fn update_config_instruction<'info>(
        ctx: Context<'_, '_, '_, 'info, UpdateConfig<'info>>,
        disable: bool
    ) -> Result<()> {
        handler_update_config(ctx, disable)?;

        Ok(())
    }
    pub fn add_liquid_instruction<'info>(
        ctx: Context<'_, '_, '_, 'info, AddLiquid<'info>>,
        amount: u64
    ) -> Result<()> {
        handler_add_liquid(ctx, amount)?;
        Ok(())
    }

    pub fn swap_token<'info>(
        ctx: Context<'_, '_, '_, 'info, SwapToken<'info>>,
        lamport_amount: u64
    ) -> Result<()> {
        handler_swap_token(ctx, lamport_amount)?;
        Ok(())
    }

    pub fn withdraw_token_instruction<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawToken<'info>>,
        amount: u64
    ) -> Result<()> {
        handler_withdraw_token(ctx, amount)?;
        Ok(())
    }

    pub fn drain_token_instruction<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawToken<'info>>
    ) -> Result<()> {
        handler_drain_token(ctx)?;
        Ok(())
    }

    pub fn withdraw_native_instruction<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawNative<'info>>,
        amount: u64
    ) -> Result<()> {
        handler_withdraw_native(ctx, amount)?;
        Ok(())
    }

    pub fn drain_native_instruction<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawNative<'info>>
    ) -> Result<()> {
        handler_drain_native(ctx)?;
        Ok(())
    }
}