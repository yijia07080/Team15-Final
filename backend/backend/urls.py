"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from api.views import upload_file, download
from api.views import get_csrf, bookmarks_init_api, bookmark_move, bookmark_rename, bookmark_new_folder, bookmark_delete
from api.views import login_view, logout_view, oauth2callback, set_password, forgot_password, reset_password

urlpatterns = [
    path('api/upload', upload_file, name='upload_file'),
    path('api/download/<int:bid>', download, name='download_file'),

    path('admin/', admin.site.urls),
    path('api/get_csrf', get_csrf, name='get_csrf'),
    path('api/bookmarks/init', bookmarks_init_api, name='bookmarks_init_api'),
    path('api/bookmarks/move/<int:bid>', bookmark_move, name='bookmarks_move'),
    path('api/bookmarks/rename/<int:bid>', bookmark_rename, name='bookmarks_rename'),
    path('api/bookmarks/new_folder', bookmark_new_folder, name='bookmarks_new_folder'),
    path('api/bookmarks/delete/<int:bid>', bookmark_delete, name='bookmarks_delete'),
    path('api/bookmarks/delete/enforce/<int:bid>', bookmark_delete, {'enforce': True}, name='bookmarks_delete_enforce'),
    
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('oauth2callback/', oauth2callback, name='oauth2callback'),
    path('password/', set_password, name='password'),
    path('forgot-password/', forgot_password, name='forgot_password'),
    path('reset-password/<str:token>/', reset_password, name='reset_password'),
]
