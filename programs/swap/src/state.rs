use anchor_lang::prelude::*;

#[account]
pub struct SwapConfigAccount {}

impl SwapConfigAccount {
    pub const LEN: usize = 8;
}