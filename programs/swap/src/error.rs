use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("user insufficient funds")]
    InsufficientFunds,

    #[msg("Account invalid type expect")]
    InvalidAccount
}