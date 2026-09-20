from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from users.models import CustomUser, Profile, Doctor

admin.site.register(CustomUser)
admin.site.register(Profile)
admin.site.register(Doctor)
