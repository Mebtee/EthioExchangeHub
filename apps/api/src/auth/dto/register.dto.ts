import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Abebe Kebede' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongP@ss1' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, and a number or special character',
  })
  password!: string;

  @ApiProperty({ example: '+251-911-123-456', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+251-\d{2,3}-\d{3}-\d{4}$/, {
    message: 'Phone number must be in format +251-XXX-XXX-XXXX',
  })
  phoneNumber?: string;
}
