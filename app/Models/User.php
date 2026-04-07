<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'FullName',
        'UserName',
        'email',
        'password',
        'DateOfBirth',
        'PhoneNumber',
        'Role',
        'Status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'DateOfBirth' => 'date',
            'Status' => 'integer',
        ];
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(UserAddress::class, 'UserID', 'id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'UserID', 'id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'UserID', 'id');
    }
}
