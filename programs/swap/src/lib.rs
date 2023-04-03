use anchor_lang::prelude::*;

pub mod state;
pub mod constants;
pub mod error;
pub mod instructions;

use crate::instructions::*;

declare_id!("swapEsYJ7iLDbYeg9154yR1dsUjumanS7LF9KEiJQae");

#[program]
pub mod swap {
    use super::*;

    pub fn init_instruction<'info>(
        ctx: Context<'_, '_, '_, 'info, Initialize<'info>>
    ) -> Result<()> {
        handler_init(ctx)?;
        Ok(())
    }
}